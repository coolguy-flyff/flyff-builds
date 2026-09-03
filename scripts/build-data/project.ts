import type {
  Ability,
  Achievement,
  BlessingTable,
  HousingGroup,
  HousingNpc,
  PetDef,
  PetGrace,
  Rarity,
  SkillAwakeTable,
  SlimClass,
  SlimItem,
  SlimSkill,
  StatAwakeDef,
  StatKey,
  UpgradeBonusRow,
} from '../../src/data/schema';
import {
  CLASS_TYPES,
  RARITIES,
  SEXES,
  STAT_KEYS,
  WEAPON_SUBCATEGORIES,
} from '../../src/data/schema';
import { SKILL_CHANCE_PREFIX } from '../../src/data/constants';

import type {
  RawAbility,
  RawAchievement,
  RawClass,
  RawHousingNpc,
  RawItem,
  RawPet,
  RawSkill,
  RawSkillLevel,
  RawSkillAwakeCategory,
  RawStatAwake,
  RawUpgradeBonusRow,
} from './source';

/**
 * Projections: raw Flyffulator records → the slim shapes in `src/data/schema.ts`. Pure functions;
 * anything that needs cross-record resolution lives in `resolveSets.ts`.
 */

export class ProjectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectionError';
  }
}

function isRarity(value: string): value is Rarity {
  return (RARITIES as readonly string[]).includes(value);
}

function isStatKey(value: string): value is StatKey {
  return (STAT_KEYS as readonly string[]).includes(value);
}

function stripUndefined<T extends object>(value: T): T {
  const entries = Object.entries(value).filter(([, v]) => v !== undefined);

  return Object.fromEntries(entries) as T;
}

/**
 * Skill-chance abilities are keyed by their skill and, when limited to one mode, by PvE / PvP —
 * Lusaka's weapons carry a PvE and a PvP stun chance that must stay apart.
 */
function skillChanceParameter(skillId: number, ability: RawAbility): string {
  let parameter = `${SKILL_CHANCE_PREFIX}${skillId}`;

  if (ability.pve === true && ability.pvp !== true) {
    parameter += ':pve';
  } else if (ability.pvp === true && ability.pve !== true) {
    parameter += ':pvp';
  }

  return parameter;
}

function projectedParameter(parameter: string, ability: RawAbility): string {
  let result = parameter;

  if (parameter === 'skillchance' && ability.skill !== undefined) {
    result = skillChanceParameter(ability.skill, ability);
  }

  return result;
}

/**
 * Keeps only abilities that carry a numeric stat (`parameter` + `add`); status-effect entries such
 * as `{ parameter: "cure", attribute: "allpoison" }` have no stat effect. A missing `rate` means
 * flat (Flyffulator special-cases this for achievements; we normalise once here).
 */
export function normalizeAbilities(raw: readonly RawAbility[] | undefined): Ability[] {
  const abilities: Ability[] = [];

  for (const ability of raw ?? []) {
    if (ability.parameter === undefined || ability.add === undefined) {
      continue;
    }

    abilities.push(
      stripUndefined({
        parameter: projectedParameter(ability.parameter, ability),
        add: ability.add,
        rate: ability.rate ?? false,
        addMax: ability.addMax,
        skill: ability.skill,
      }),
    );
  }

  return abilities;
}

function optionalAbilities(raw: readonly RawAbility[] | undefined): Ability[] | undefined {
  const abilities = normalizeAbilities(raw);

  return abilities.length === 0 ? undefined : abilities;
}

export function projectItem(raw: RawItem): SlimItem {
  if (!isRarity(raw.rarity)) {
    throw new ProjectionError(`Item ${raw.id} has unknown rarity "${raw.rarity}"`);
  }

  const sex =
    raw.sex === undefined
      ? undefined
      : (SEXES as readonly string[]).includes(raw.sex)
        ? (raw.sex as SlimItem['sex'])
        : undefined;

  return stripUndefined({
    id: raw.id,
    name: raw.name.en,
    icon: raw.icon,
    class: raw.class,
    level: raw.level,
    category: raw.category,
    subcategory: raw.subcategory,
    rarity: raw.rarity,
    sex,
    minDefense: raw.minDefense,
    maxDefense: raw.maxDefense,
    minAttack: raw.minAttack,
    maxAttack: raw.maxAttack,
    attackSpeedValue: raw.attackSpeedValue,
    twoHanded: raw.twoHanded,
    additionalSkillDamage: raw.additionalSkillDamage,
    abilities: optionalAbilities(raw.abilities),
    possibleRandomStats: optionalAbilities(raw.possibleRandomStats),
    upgradeLevels: raw.upgradeLevels?.map((level) => ({
      upgradeLevel: level.upgradeLevel,
      requiredLevel: level.requiredLevel,
      abilities: normalizeAbilities(level.abilities),
    })),
    duration: raw.duration,
    minimumTargetItemLevel: raw.minimumTargetItemLevel,
  });
}

export function projectClass(raw: RawClass): SlimClass {
  const type = (CLASS_TYPES as readonly string[]).includes(raw.type)
    ? (raw.type as SlimClass['type'])
    : undefined;

  if (type === undefined) {
    throw new ProjectionError(`Class ${raw.id} has unknown type "${raw.type}"`);
  }

  const autoAttackFactors: Partial<Record<(typeof WEAPON_SUBCATEGORIES)[number], number>> = {};

  for (const subcategory of WEAPON_SUBCATEGORIES) {
    const factor = raw.autoAttackFactors[subcategory];

    if (factor === undefined) {
      throw new ProjectionError(`Class ${raw.id} lacks autoAttackFactors.${subcategory}`);
    }

    autoAttackFactors[subcategory] = factor;
  }

  return stripUndefined({
    id: raw.id,
    name: raw.name.en,
    type,
    parent: raw.parent,
    icon: raw.icon,
    minLevel: raw.minLevel,
    maxLevel: raw.maxLevel,
    hp: raw.hp,
    mp: raw.mp,
    fp: raw.fp,
    defense: raw.defense,
    magicDefenseStaFactor: raw.magicDefenseStaFactor,
    magicDefenseIntFactor: raw.magicDefenseIntFactor,
    attackSpeed: raw.attackSpeed,
    block: raw.block,
    critical: raw.critical,
    autoAttackFactors: autoAttackFactors as SlimClass['autoAttackFactors'],
  });
}

export function projectStatAwake(raw: RawStatAwake): StatAwakeDef {
  const abilities = normalizeAbilities(raw.abilities).map((ability) => {
    if (!isStatKey(ability.parameter)) {
      throw new ProjectionError(
        `Stat awake "${raw.title.en}" uses non-stat parameter ${ability.parameter}`,
      );
    }

    return { parameter: ability.parameter, add: ability.add };
  });

  return { title: raw.title.en, minimumLevel: raw.minimumLevel, abilities };
}

function rarityLists(
  category: string,
  parameter: string,
  byRarity: Record<string, number[]>,
): Partial<Record<Rarity, number[]>> {
  const rarities: Partial<Record<Rarity, number[]>> = {};

  for (const [rarity, values] of Object.entries(byRarity)) {
    if (!isRarity(rarity)) {
      throw new ProjectionError(
        `Skill awake ${category}.${parameter} has unknown rarity "${rarity}"`,
      );
    }

    rarities[rarity] = values;
  }

  return rarities;
}

/**
 * Stat-type (`parameters`) awakes keep their parameter name; skill-damage awakes travel under a
 * `skill:<id>` pseudo-parameter (their names live in the `awakeSkills` table). Damage awakes have
 * no stat effect yet — they are offered and stored for future work.
 */
export function projectSkillAwakes(raw: Record<string, RawSkillAwakeCategory>): SkillAwakeTable {
  const table: SkillAwakeTable = {};

  for (const [category, entry] of Object.entries(raw)) {
    const byParameter: SkillAwakeTable[string] = {};

    for (const [parameter, byRarity] of Object.entries(entry.parameters ?? {})) {
      byParameter[parameter] = rarityLists(category, parameter, byRarity);
    }

    for (const [skillId, byRarity] of Object.entries(entry.skills ?? {})) {
      byParameter[`skill:${skillId}`] = rarityLists(category, `skill:${skillId}`, byRarity);
    }

    if (Object.keys(byParameter).length > 0) {
      table[category] = byParameter;
    }
  }

  return table;
}

/** Every skill id referenced by a skill-damage awake, ascending. */
export function collectAwakeSkillIds(raw: Record<string, RawSkillAwakeCategory>): number[] {
  const ids = new Set<number>();

  for (const entry of Object.values(raw)) {
    for (const id of Object.keys(entry.skills ?? {})) {
      ids.add(Number(id));
    }
  }

  return [...ids].sort((a, b) => a - b);
}

/** Every skill id referenced by an item's skill-chance ability, ascending (bundled by name). */
export function collectSkillChanceSkillIds(items: Readonly<Record<string, RawItem>>): number[] {
  const ids = new Set<number>();

  for (const item of Object.values(items)) {
    for (const ability of item.abilities ?? []) {
      if (ability.parameter === 'skillchance' && ability.skill !== undefined) {
        ids.add(ability.skill);
      }
    }
  }

  return [...ids].sort((a, b) => a - b);
}

export function projectUpgradeBonusRow(raw: RawUpgradeBonusRow): UpgradeBonusRow {
  return {
    upgradeLevel: raw.upgradeLevel,
    weaponAttack: raw.weaponAttack,
    helmetDefense: raw.helmetDefense,
    suitDefense: raw.suitDefense,
    gauntletDefense: raw.gauntletDefense,
    bootsDefense: raw.bootsDefense,
    shieldDefense: raw.shieldDefense,
    setAbilities: normalizeAbilities(raw.setAbilities),
  };
}

export function projectBlessings(raw: Record<string, readonly RawAbility[]>): BlessingTable {
  const table: BlessingTable = {};

  for (const [parameter, entries] of Object.entries(raw)) {
    const abilities = normalizeAbilities(entries);
    const first = abilities[0];

    if (first === undefined) {
      throw new ProjectionError(`Blessing ${parameter} has no values`);
    }

    table[parameter] = { rate: first.rate, values: abilities.map((ability) => ability.add) };
  }

  return table;
}

export function projectAchievement(raw: RawAchievement): Achievement {
  return {
    id: raw.id,
    name: raw.name.en,
    image: raw.image,
    abilities: normalizeAbilities(raw.abilities),
  };
}

const HOUSING_GROUP_PREFIXES: readonly { prefix: string; group: HousingGroup }[] = [
  { prefix: '[Personal House NPC] ', group: 'personal' },
  { prefix: '[Guild Ship NPC] ', group: 'guild' },
];

export function projectHousingNpc(raw: RawHousingNpc): HousingNpc {
  const match = HOUSING_GROUP_PREFIXES.find((entry) => raw.name.en.startsWith(entry.prefix));

  if (match === undefined) {
    throw new ProjectionError(
      `Housing NPC ${raw.id} "${raw.name.en}" has no recognised group prefix`,
    );
  }

  return {
    id: raw.id,
    name: raw.name.en,
    shortName: raw.name.en.slice(match.prefix.length),
    group: match.group,
    abilities: normalizeAbilities(raw.abilities),
  };
}

/** Looks up a raw skill by id; the pipeline resolves cross-skill references through it. */
export type SkillLookup = (skillId: number) => RawSkill | undefined;

export function requireRawSkill(lookup: SkillLookup, skillId: number, context: string): RawSkill {
  const skill = lookup(skillId);

  if (skill === undefined) {
    throw new ProjectionError(`${context}: skill ${skillId} is missing from Skills.json`);
  }

  return skill;
}

/**
 * The grace buff comes from the top raise tier: every tier names the same skill, and the grace
 * level equals the number of raised tiers, so the skill's level list is bundled whole.
 */
function projectPetGrace(raw: RawPet, lookup: SkillLookup): PetGrace | undefined {
  const top = raw.tiers?.[raw.tiers.length - 1];
  let grace: PetGrace | undefined;

  if (top?.graceSkill !== undefined) {
    const skill = requireRawSkill(lookup, top.graceSkill, `Pet ${raw.petItemId} grace`);
    const levels = (skill.levels ?? []).map((level) => normalizeAbilities(level.abilities));

    if (levels.length === 0) {
      throw new ProjectionError(`Pet ${raw.petItemId}: grace skill ${skill.id} has no levels`);
    }

    grace = {
      skillId: skill.id,
      name: skill.name.en,
      icon: skill.icon,
      durationSeconds: top.graceSkillDuration ?? 0,
      cooldownSeconds: top.graceSkillCooldown ?? 0,
      energy: top.graceSkillEnergyConsumption ?? 0,
      levels,
    };
  }

  return grace;
}

export function projectPet(raw: RawPet, name: string, lookup: SkillLookup): PetDef | undefined {
  let def: PetDef | undefined;

  if (raw.parameter !== undefined && raw.values !== undefined) {
    def = stripUndefined({
      petItemId: raw.petItemId,
      name,
      parameter: raw.parameter,
      rate: raw.rate ?? false,
      values: raw.values,
      grace: projectPetGrace(raw, lookup),
    });
  }

  return def;
}

/** The last entry of a skill's level list, i.e. its maximum level. */
export function maxLevelOf(raw: RawSkill): RawSkillLevel {
  const levels = raw.levels ?? [];
  const max = levels[levels.length - 1];

  if (max === undefined) {
    throw new ProjectionError(`Skill ${raw.id} "${raw.name.en}" has no levels`);
  }

  return max;
}

export function projectSkill(raw: RawSkill, lookup: SkillLookup): SlimSkill {
  const max = maxLevelOf(raw);

  return {
    id: raw.id,
    name: raw.name.en,
    icon: raw.icon,
    levelCount: (raw.levels ?? []).length,
    max: {
      abilities: normalizeAbilities(max.abilities),
      scalingParameters: (max.scalingParameters ?? []).map((scale) =>
        stripUndefined({
          parameter: scale.parameter,
          stat:
            scale.stat === undefined
              ? undefined
              : isStatKey(scale.stat) || scale.stat === 'hp'
                ? scale.stat
                : undefined,
          scale: scale.scale,
          maximum: scale.maximum,
          add: scale.add ?? true,
          pve: scale.pve ?? true,
          pvp: scale.pvp ?? true,
        }),
      ),
      synergies: (max.synergies ?? []).map((synergy) => ({
        parameter: synergy.parameter,
        skill: synergy.skill,
        sourceLevelCount: (
          requireRawSkill(lookup, synergy.skill, `Skill ${raw.id} synergy`).levels ?? []
        ).length,
        minLevel: synergy.minLevel,
        add: synergy.add ?? true,
        scale: synergy.scale,
        pve: synergy.pve ?? true,
        pvp: synergy.pvp ?? true,
      })),
    },
  };
}

/**
 * The RM buff card assumes every caster-stat scaling has a cap to sit at; a scaling without one
 * would need the caster's live stat, which the app does not model.
 */
export function assertCappedScalings(skill: SlimSkill): void {
  const parameters = new Set(skill.max.abilities.map((ability) => ability.parameter));

  for (const scale of skill.max.scalingParameters) {
    if (
      parameters.has(scale.parameter) &&
      scale.stat !== undefined &&
      scale.maximum === undefined
    ) {
      throw new ProjectionError(
        `Skill ${skill.id} "${skill.name}" scales ${scale.parameter} by ${scale.stat} without a maximum`,
      );
    }
  }
}

export function projectStatNames(raw: Record<string, { en: string }>): Record<string, string> {
  return Object.fromEntries(Object.entries(raw).map(([id, name]) => [id, name.en]));
}
