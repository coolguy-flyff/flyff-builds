import { requireDefined } from '@/lib/assert';

import { SKILL_CHANCE_PREFIX } from './constants';
import type {
  Ability,
  AccessoryLine,
  AccessorySet,
  AccessorySlot,
  Achievement,
  ArmorSet,
  AwakeSkill,
  BlessingTable,
  ClassSkill,
  GeneratedData,
  HousingNpc,
  Manifest,
  PetDef,
  SkillAwakeTable,
  SlimClass,
  SlimItem,
  SlimSkill,
  StatAwakeDef,
  UpgradeBonusRow,
} from './schema';

/**
 * Indexed, read-only view over the generated tables. Built once at startup; every domain function
 * receives it explicitly (no singleton), so tests can run on tiny fixtures.
 */
export interface GameData {
  readonly items: ReadonlyMap<number, SlimItem>;
  readonly classes: ReadonlyMap<number, SlimClass>;
  readonly thirdJobs: readonly SlimClass[];
  /** jobId → [jobId, parentId, grandparentId, …] */
  readonly classChains: ReadonlyMap<number, readonly number[]>;
  readonly armorSets: ReadonlyMap<number, ArmorSet>;
  readonly armorSetsByJob: ReadonlyMap<number, readonly ArmorSet[]>;
  readonly accessorySets: readonly AccessorySet[];
  /** Standalone "CW jewel" lines that can be mixed into an accessory set (table order). */
  readonly accessoryLines: readonly AccessoryLine[];
  readonly weaponsByJob: ReadonlyMap<number, readonly SlimItem[]>;
  readonly shieldsByJob: ReadonlyMap<number, readonly SlimItem[]>;
  readonly suitCards: readonly SlimItem[];
  readonly weaponCards: readonly SlimItem[];
  readonly jewels: readonly SlimItem[];
  readonly cloaks: readonly SlimItem[];
  readonly masks: readonly SlimItem[];
  readonly pets: readonly PetDef[];
  readonly powerups: readonly SlimItem[];
  /** Bundled skills by id: RM buffs, healing skills and every class skill. */
  readonly skills: ReadonlyMap<number, SlimSkill>;
  readonly classSkills: ReadonlyMap<number, ClassSkill>;
  /** jobId → the class skills of its chain, first job first, then by required level. */
  readonly classSkillsByJob: ReadonlyMap<number, readonly ClassSkill[]>;
  readonly statAwakes: readonly StatAwakeDef[];
  readonly skillAwakes: SkillAwakeTable;
  /** Skills that can appear as `skill:<id>` damage awakes (name + icon). */
  readonly awakeSkills: ReadonlyMap<number, AwakeSkill>;
  readonly upgradeBonus: readonly UpgradeBonusRow[];
  readonly blessings: BlessingTable;
  readonly achievements: readonly Achievement[];
  readonly personalNpcs: readonly HousingNpc[];
  readonly guildNpcs: readonly HousingNpc[];
  readonly statNames: Readonly<Record<string, string>>;
  readonly manifest: Manifest;
}

function byName(a: { name: string }, b: { name: string }): number {
  return a.name.localeCompare(b.name);
}

function byLevelDescThenName(a: SlimItem, b: SlimItem): number {
  return b.level - a.level || byName(a, b);
}

function buildClassChains(classes: ReadonlyMap<number, SlimClass>): Map<number, readonly number[]> {
  const chains = new Map<number, readonly number[]>();

  for (const cls of classes.values()) {
    const chain: number[] = [];
    let current: SlimClass | undefined = cls;

    while (current !== undefined) {
      chain.push(current.id);
      current = current.parent === undefined ? undefined : classes.get(current.parent);
    }

    chains.set(cls.id, chain);
  }

  return chains;
}

function isUsableByChain(item: SlimItem, chain: readonly number[]): boolean {
  return item.class === undefined || chain.includes(item.class);
}

/**
 * The class skills a job can learn, ordered the way a skill tree reads: first job's skills first
 * (the chain lists the third job first, so its index is reversed), then by required level.
 */
function groupClassSkillsByJob(
  thirdJobs: readonly SlimClass[],
  classChains: ReadonlyMap<number, readonly number[]>,
  classSkills: readonly ClassSkill[],
): Map<number, readonly ClassSkill[]> {
  const grouped = new Map<number, readonly ClassSkill[]>();

  for (const job of thirdJobs) {
    const chain = requireDefined(classChains.get(job.id), `No class chain for job ${job.id}`);
    const chainOrder = (skill: ClassSkill): number => chain.length - chain.indexOf(skill.classId);

    grouped.set(
      job.id,
      classSkills
        .filter((skill) => chain.includes(skill.classId))
        .sort((a, b) => chainOrder(a) - chainOrder(b) || a.level - b.level || byName(a, b)),
    );
  }

  return grouped;
}

function groupByJob(
  thirdJobs: readonly SlimClass[],
  classChains: ReadonlyMap<number, readonly number[]>,
  candidates: readonly SlimItem[],
): Map<number, readonly SlimItem[]> {
  const grouped = new Map<number, readonly SlimItem[]>();

  for (const job of thirdJobs) {
    const chain = requireDefined(classChains.get(job.id), `No class chain for job ${job.id}`);
    grouped.set(
      job.id,
      candidates.filter((item) => isUsableByChain(item, chain)).sort(byLevelDescThenName),
    );
  }

  return grouped;
}

/**
 * Parameters that never reach the results: EXP / drop / party boosts, out-of-combat perks (revive
 * restores, vendor days, dungeon entries, jewel enchants, flying), upgrade and piercing chances.
 * Items and housing NPCs granting only these (or guild-artifact effects) are hidden.
 */
const RESULT_NEUTRAL_PARAMETERS: ReadonlySet<string> = new Set([
  'exprate',
  'droprate',
  'partyexp',
  'explossreduction',
  'flyspeed',
  'samejewelenchant',
  'freedungeonentry',
  'addedvendordays',
  'reviverestorehp',
  'reviverestoremp',
  'reviverestorefp',
  'generalupgraderate',
  'accessoryupgraderate',
  'piercingrate',
]);
const GUILD_ARTIFACT_MARKER = 'guildartifact';

function affectsResults(ability: Ability): boolean {
  return (
    !RESULT_NEUTRAL_PARAMETERS.has(ability.parameter) &&
    !ability.parameter.includes(GUILD_ARTIFACT_MARKER)
  );
}

function grantsCombatStats(item: SlimItem): boolean {
  const abilities = item.abilities ?? [];

  // The Upcut Stone has no abilities at all: its ×1.2 lives in the attack formula, so it stays.
  return abilities.length === 0 || abilities.some(affectsResults);
}

function npcGrantsCombatStats(npc: HousingNpc): boolean {
  return npc.abilities.some(affectsResults);
}

export function createGameData(raw: GeneratedData): GameData {
  const items = new Map(raw.items.map((item) => [item.id, item]));
  const classes = new Map(raw.classes.map((cls) => [cls.id, cls]));
  const thirdJobs = raw.classes.filter((cls) => cls.type === 'specialist').sort(byName);
  const classChains = buildClassChains(classes);
  const allItems = [...items.values()];

  const armorSetsByJob = new Map<number, readonly ArmorSet[]>();

  for (const job of thirdJobs) {
    const chain = requireDefined(classChains.get(job.id), `No class chain for job ${job.id}`);

    // Every set of the job's chain (1st/2nd job and Vagrant sets included), endgame first.
    armorSetsByJob.set(
      job.id,
      raw.armorSets
        .filter((set) => chain.includes(set.jobId))
        .sort((a, b) => b.level - a.level || byName(a, b)),
    );
  }

  const weapons = allItems.filter((item) => item.category === 'weapon');
  const shields = allItems.filter((item) => item.subcategory === 'shield');
  const cards = allItems.filter((item) => item.subcategory === 'piercingcard');
  const housingNpcs = raw.housingNpcs.filter(npcGrantsCombatStats).sort((a, b) => a.id - b.id);

  return {
    items,
    classes,
    thirdJobs,
    classChains,
    armorSets: new Map(raw.armorSets.map((set) => [set.id, set])),
    armorSetsByJob,
    accessorySets: [...raw.accessorySets].sort(byName),
    accessoryLines: raw.accessoryLines,
    weaponsByJob: groupByJob(thirdJobs, classChains, weapons),
    shieldsByJob: groupByJob(thirdJobs, classChains, shields),
    suitCards: cards.filter((card) => card.pierceTarget === 'suit').sort(byName),
    weaponCards: cards.filter((card) => card.pierceTarget === 'weapon').sort(byName),
    jewels: allItems.filter((item) => item.subcategory === 'ultimatejewel').sort(byName),
    cloaks: allItems.filter((item) => item.subcategory === 'cloak').sort(byName),
    masks: allItems.filter((item) => item.subcategory === 'mask').sort(byName),
    pets: [...raw.pets].sort(byName),
    powerups: allItems
      .filter(
        (item) =>
          item.category === 'buff' || item.category === 'scroll' || item.duration !== undefined,
      )
      .filter(
        (item) =>
          item.category !== 'weapon' &&
          item.category !== 'armor' &&
          item.category !== 'jewelry' &&
          item.category !== 'fashion' &&
          item.category !== 'raisedpet' &&
          item.category !== 'material',
      )
      .filter(grantsCombatStats)
      .sort(byName),
    skills: new Map([...raw.skills, ...raw.classSkills].map((skill) => [skill.id, skill])),
    classSkills: new Map(raw.classSkills.map((skill) => [skill.id, skill])),
    classSkillsByJob: groupClassSkillsByJob(thirdJobs, classChains, raw.classSkills),
    statAwakes: raw.statAwakes,
    skillAwakes: raw.skillAwakes,
    awakeSkills: new Map(raw.awakeSkills.map((skill) => [skill.id, skill])),
    upgradeBonus: [...raw.upgradeBonus].sort((a, b) => a.upgradeLevel - b.upgradeLevel),
    blessings: raw.blessings,
    achievements: [...raw.achievements].sort((a, b) => a.id - b.id),
    personalNpcs: housingNpcs.filter((npc) => npc.group === 'personal'),
    guildNpcs: housingNpcs.filter((npc) => npc.group === 'guild'),
    statNames: raw.statNames,
    manifest: raw.manifest,
  };
}

export function getItem(data: GameData, itemId: number): SlimItem | undefined {
  return data.items.get(itemId);
}

export function requireItem(data: GameData, itemId: number): SlimItem {
  return requireDefined(data.items.get(itemId), `Unknown item id ${itemId}`);
}

export function requireClass(data: GameData, classId: number): SlimClass {
  return requireDefined(data.classes.get(classId), `Unknown class id ${classId}`);
}

export function requireSkill(data: GameData, skillId: number): SlimSkill {
  return requireDefined(data.skills.get(skillId), `Unknown skill id ${skillId}`);
}

/** Whether `jobId` is `otherJobId` or descends from it (Flyffulator `isAnteriorJob`). */
export function isAnteriorJob(data: GameData, jobId: number, otherJobId: number): boolean {
  return data.classChains.get(jobId)?.includes(otherJobId) ?? false;
}

/** The class skills a job can switch on; empty for an unknown job. */
export function classSkillsFor(data: GameData, jobId: number): readonly ClassSkill[] {
  return data.classSkillsByJob.get(jobId) ?? [];
}

/** A fresh build starts with the job's permanent passives on; buffs are opt-in. */
export function defaultClassSkillIds(data: GameData, jobId: number): number[] {
  return classSkillsFor(data, jobId)
    .filter((skill) => skill.permanent)
    .map((skill) => skill.id);
}

/** The CW jewel lines worn in a slot (rings: Strente…Meteofy; earrings: Speedo…; necklaces: Pep…). */
export function accessoryLinesFor(data: GameData, slot: AccessorySlot): readonly AccessoryLine[] {
  return data.accessoryLines.filter((line) => line.slot === slot);
}

const SKILL_CHANCE_MODE_SUFFIXES: Readonly<Record<string, string>> = {
  pve: ' (PvE)',
  pvp: ' (PvP)',
};

/** "Stun chance (PvE)" for `skillchance:<skillId>[:pve|:pvp]`; undefined for an unknown skill. */
function skillChanceName(data: GameData, parameter: string): string | undefined {
  const [skillId, mode] = parameter.slice(SKILL_CHANCE_PREFIX.length).split(':');
  const skill = data.awakeSkills.get(Number(skillId));
  let name: string | undefined;

  if (skill !== undefined) {
    name = `${skill.name} chance${SKILL_CHANCE_MODE_SUFFIXES[mode ?? ''] ?? ''}`;
  }

  return name;
}

export function getStatName(data: GameData, parameter: string): string {
  let name = data.statNames[parameter];

  if (name === undefined && parameter.startsWith(SKILL_CHANCE_PREFIX)) {
    name = skillChanceName(data, parameter);
  }

  return name ?? parameter;
}
