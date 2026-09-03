import {
  ACCESSORY_SET_IDS,
  getItem,
  getStatName,
  type Ability,
  type AccessorySet,
  type GameData,
  type SlimItem,
} from '@/data';
import { roundTo } from '@/lib/math';

import {
  accessoryParts,
  type AccessoryPart,
  minBlessingSlots,
  reachablePetTotals,
  setAwakeTotals,
  statAwakeTotals,
} from '../rules';

import type {
  AccessorySetEntry,
  BuildState,
  EquipmentSetEntry,
  FashionSetEntry,
  GearSwap,
  PetEntry,
  ShieldEntry,
  Stack,
  StatAwake,
  StatPage,
  WeaponEntry,
} from './schema';

/**
 * Auto-generated entry names (plan A5.1, revised 2026-09-02). Names are pure functions of data +
 * entry; a custom name always wins. Gear reads "<dominant stats> <item> +<upgrade>" with the
 * upgrade omitted at +0: "HP/STA Etranar +10", "STA Healing Oracle +10", "STA/Crit Fashion";
 * accessory sets use their upgrade signature (r1 e1 necklace e2 r2), pets "Perfect <animal>".
 */

const SKILL_AWAKE_PARAMETER_PREFIX = 'skill:';

/** "+10" when upgraded, nothing at +0. */
function upgradeSuffix(upgrade: number): string | null {
  return upgrade > 0 ? `+${upgrade}` : null;
}

function joinWords(parts: readonly (string | null | undefined)[]): string {
  return parts.filter((part): part is string => typeof part === 'string' && part !== '').join(' ');
}

/** Compact stat labels for chips and names; falls back to the game's stat name. */
const SHORT_STAT_LABELS: Readonly<Record<string, string>> = {
  str: 'STR',
  sta: 'STA',
  dex: 'DEX',
  int: 'INT',
  allstats: 'All Stats',
  maxhp: 'HP',
  maxmp: 'MP',
  maxfp: 'FP',
  attack: 'Attack',
  damage: 'Dmg',
  def: 'Def',
  magicdefense: 'M.Def',
  magicattack: 'M.Atk',
  criticalchance: 'Crit',
  criticaldamage: 'Crit dmg',
  attackspeed: 'Aspd',
  attackspeedrate: 'Aspd',
  decreasedcastingtime: 'Cast Speed',
  speed: 'Spd',
  healing: 'Heal',
  hitrate: 'Hit Rate',
  parry: 'Parry',
  block: 'Block',
  meleeblock: 'M.Block',
  rangedblock: 'R.Block',
  blockpenetration: 'Block pen',
  skilldamage: 'Skill dmg',
  pvedamage: 'PvE dmg',
  pvpdamage: 'PvP dmg',
  pvedamagereduction: 'PvE red',
  pvpdamagereduction: 'PvP red',
  criticalresist: 'Crit res',
  decreasedmpconsumption: 'Dec. MP cost',
  decreasedfpconsumption: 'Dec. FP cost',
};

export function shortStatLabel(data: GameData, parameter: string): string {
  return SHORT_STAT_LABELS[parameter] ?? getStatName(data, parameter);
}

export function formatStatValue(value: number, rate: boolean): string {
  const rounded = roundTo(value, 2);
  const sign = rounded < 0 ? '−' : '+';

  return `${sign}${Math.abs(rounded)}${rate ? '%' : ''}`;
}

export function formatAbility(
  data: GameData,
  parameter: string,
  value: number,
  rate: boolean,
): string {
  return `${shortStatLabel(data, parameter)} ${formatStatValue(value, rate)}`;
}

/** "2026 FWC Golden Etranar Set" → "Golden Etranar"; "Primordial Etranar Set" → "Primordial Etranar". */
export function armorSetShortName(name: string): string {
  return name.replace(/^2026 FWC /, '').replace(/ Set$/, '');
}

/** "Adept's Set" → "Adept's". */
export function accessorySetShortName(name: string): string {
  return name.replace(/ Set$/, '');
}

/** "2026 FWC Golden Oracle" → "Golden Oracle"; keeps other names verbatim. */
export function itemShortName(name: string): string {
  return name.replace(/^2026 FWC /, '').replace(/^FWC /, '');
}

/** "Volcano Card (7%)" → "Volcano 7%"; "Land Card (A)" → "Land A". */
export function cardShortName(name: string): string {
  return name.replace(/ Card \(([^)]+)\)$/, ' $1');
}

/** "Shining Amethyst (10)" → "Amethyst 10"; "Rune of Attack" stays. */
export function jewelShortName(name: string): string {
  return name.replace(/^Shining /, '').replace(/ \((\d+)\)$/, ' $1');
}

export function isRuneItem(item: SlimItem): boolean {
  return item.name.startsWith('Rune of ');
}

/** Aggregates stack abilities per parameter: "HP +28%", "STA +60". */
export function stackTotals(data: GameData, stacks: readonly Stack[]): Ability[] {
  const totals = new Map<string, Ability>();

  for (const stack of stacks) {
    const item = getItem(data, stack.itemId);

    for (const ability of item?.abilities ?? []) {
      const key = `${ability.parameter}:${ability.rate}`;
      const existing = totals.get(key);

      if (existing === undefined) {
        totals.set(key, {
          parameter: ability.parameter,
          add: ability.add * stack.count,
          rate: ability.rate,
        });
      } else {
        totals.set(key, { ...existing, add: existing.add + ability.add * stack.count });
      }
    }
  }

  return [...totals.values()];
}

export function autoStatPageName(build: BuildState, page: StatPage): string {
  const index = build.statPages.findIndex((candidate) => candidate.id === page.id);

  return `Page ${index + 1}`;
}

/** The suit-piercing stat with the largest total ("HP" for 4 × Volcano), if any. */
function dominantStackStat(data: GameData, stacks: readonly Stack[]): string | undefined {
  const [top] = [...stackTotals(data, stacks)].sort((a, b) => b.add - a.add);

  return top === undefined ? undefined : shortStatLabel(data, top.parameter);
}

/** The larger of the two set-awake totals ("STA" for STA +12 / INT +8), if any. */
function dominantSetAwakeStat(entry: EquipmentSetEntry): string | undefined {
  const [top] = Object.entries(setAwakeTotals(entry.statAwake)).sort((a, b) => b[1] - a[1]);

  return top === undefined ? undefined : top[0].toUpperCase();
}

/** "HP/STA Etranar +10": piercing stat / dominant awake stat, set, upgrade (omitted at +0). */
export function autoEquipmentSetName(data: GameData, entry: EquipmentSetEntry): string {
  const set = entry.setId === null ? undefined : data.armorSets.get(entry.setId);
  let name = 'Equipment set';

  if (set !== undefined) {
    const stats = [dominantStackStat(data, entry.suitCards), dominantSetAwakeStat(entry)]
      .filter((stat): stat is string => stat !== undefined)
      .join('/');

    name = joinWords([stats, armorSetShortName(set.name), upgradeSuffix(entry.upgrade)]);
  }

  return name;
}

interface StatTotal {
  readonly parameter: string;
  readonly rate: boolean;
  add: number;
}

/**
 * Overall stat totals a weapon or shield carries: stat awake + skill awake + cards + non-rune
 * jewels, merged per stat and sorted by value (descending); runes are counted separately.
 */
export function weaponStatSummary(
  data: GameData,
  entry: {
    readonly statAwake: StatAwake;
    readonly skillAwake: { parameter: string; value: number } | null;
    readonly cards: readonly Stack[];
    readonly jewels?: readonly Stack[];
  },
): { totals: readonly StatTotal[]; runeCount: number } {
  const totals = new Map<string, StatTotal>();
  let runeCount = 0;

  const push = (parameter: string, add: number, rate: boolean): void => {
    const key = `${parameter}:${rate}`;
    const existing = totals.get(key);

    if (existing === undefined) {
      totals.set(key, { parameter, rate, add });
    } else {
      existing.add += add;
    }
  };

  for (const [stat, value] of Object.entries(statAwakeTotals(entry.statAwake))) {
    push(stat, value, false);
  }

  if (
    entry.skillAwake !== null &&
    !entry.skillAwake.parameter.startsWith(SKILL_AWAKE_PARAMETER_PREFIX)
  ) {
    push(entry.skillAwake.parameter, entry.skillAwake.value, true);
  }

  const stackAbilities = (stacks: readonly Stack[]): void => {
    for (const stack of stacks) {
      const item = getItem(data, stack.itemId);

      if (item === undefined) {
        continue;
      }

      if (isRuneItem(item)) {
        runeCount += stack.count;
        continue;
      }

      for (const ability of item.abilities ?? []) {
        push(ability.parameter, ability.add * stack.count, ability.rate);
      }
    }
  };

  stackAbilities(entry.cards);
  stackAbilities(entry.jewels ?? []);

  const sorted = [...totals.values()].sort(
    (a, b) => b.add - a.add || a.parameter.localeCompare(b.parameter),
  );

  return { totals: sorted, runeCount };
}

/** The skill awake as a word: the stat ("Healing") or the awakened skill's name ("Moon Beam"). */
function skillAwakeWord(
  data: GameData,
  awake: { parameter: string; value: number } | null,
): string | undefined {
  let word: string | undefined;

  if (awake !== null) {
    if (awake.parameter.startsWith(SKILL_AWAKE_PARAMETER_PREFIX)) {
      const skillId = Number(awake.parameter.slice(SKILL_AWAKE_PARAMETER_PREFIX.length));

      word = data.awakeSkills.get(skillId)?.name;
    } else {
      word = getStatName(data, awake.parameter);
    }
  }

  return word;
}

/** "STA Healing Oracle +10": dominant stat total, skill awake, item, upgrade (omitted at +0). */
function autoHeldItemName(
  data: GameData,
  entry: WeaponEntry | ShieldEntry,
  fallback: string,
): string {
  const item = entry.itemId === null ? undefined : getItem(data, entry.itemId);
  let name = fallback;

  if (item !== undefined) {
    const [dominant] = weaponStatSummary(data, entry).totals;

    name = joinWords([
      dominant === undefined ? undefined : shortStatLabel(data, dominant.parameter),
      skillAwakeWord(data, entry.skillAwake),
      itemShortName(item.name),
      upgradeSuffix(entry.upgrade),
    ]);
  }

  return name;
}

export function autoWeaponName(data: GameData, entry: WeaponEntry): string {
  return autoHeldItemName(data, entry, 'Weapon');
}

export function autoShieldName(data: GameData, entry: ShieldEntry): string {
  return autoHeldItemName(data, entry, 'Shield');
}

/** "+9" → "9", "+10" → "X": one character per piece in the accessory signature. */
function upgradeDigit(upgrade: number): string {
  return upgrade === 10 ? 'X' : String(upgrade);
}

/** "Adept's 94869" — pieces in wear order: ring 1, earring 1, necklace, earring 2, ring 2. */
export function accessoryUpgradeSignature(entry: AccessorySetEntry): string {
  const { ring1, ring2, earring1, earring2, necklace } = entry.upgrades;

  return [ring1, earring1, necklace, earring2, ring2].map(upgradeDigit).join('');
}

/** Set abbreviations for mixed names (plan feedback 2026-09-03, item 4). */
const ACCESSORY_SET_ABBREVIATIONS: Readonly<Record<number, string>> = {
  [ACCESSORY_SET_IDS.adepts]: 'Adept',
  [ACCESSORY_SET_IDS.marksmans]: 'MM',
  [ACCESSORY_SET_IDS.defenders]: 'Def',
  [ACCESSORY_SET_IDS.champions]: 'Champ',
};

/** Two or more CW jewel lines in one mix read as one collective part. */
const CW_JEWELS_LABEL = 'CW';

/** "Adept", "MM", "Def", "Champ" — falls back to the short name for a set the table doesn't know. */
export function accessorySetAbbreviation(set: AccessorySet): string {
  return ACCESSORY_SET_ABBREVIATIONS[set.id] ?? accessorySetShortName(set.name);
}

/**
 * "Adept/CW", "Adept/Speedo", "Def/MM": one label per part in part order (the entry's set first);
 * two or more CW jewel lines collapse into "CW" where the first of them sits.
 */
function accessoryMixLabel(parts: readonly AccessoryPart[]): string {
  const lineCount = parts.filter((part) => part.source.kind === 'line').length;
  const labels: string[] = [];

  for (const part of parts) {
    if (part.source.kind === 'set') {
      labels.push(accessorySetAbbreviation(part.source.set));
    } else if (lineCount === 1) {
      labels.push(part.source.line.name);
    } else if (!labels.includes(CW_JEWELS_LABEL)) {
      labels.push(CW_JEWELS_LABEL);
    }
  }

  return labels.join('/');
}

/**
 * "Adept's X0700" for a full set, "Clean Adept's" at +0; a mix reads "Adept/CW X555X" — the parts
 * by abbreviation, then the same per-piece upgrade signature in wear order.
 */
export function autoAccessorySetName(data: GameData, entry: AccessorySetEntry): string {
  const parts = accessoryParts(data, entry);
  const [first] = parts;
  let name = 'Accessory set';

  if (first !== undefined) {
    const label =
      parts.length === 1 && first.source.kind === 'set'
        ? accessorySetShortName(first.source.set.name)
        : accessoryMixLabel(parts);
    const signature = accessoryUpgradeSignature(entry);

    // All pieces at +0 read better as "Clean Adept's" than "Adept's 00000".
    name = signature === '00000' ? `Clean ${label}` : `${label} ${signature}`;
  }

  return name;
}

/** Blessing stats by the slots they need (descending), then line order: the "dominant" ones. */
function dominantBlessingStats(data: GameData, entry: FashionSetEntry): string[] {
  return entry.blessings
    .map((line, index) => ({
      label: shortStatLabel(data, line.parameter),
      slots: minBlessingSlots(data, line.parameter, line.total) ?? 0,
      index,
    }))
    .sort((a, b) => b.slots - a.slots || a.index - b.index)
    .slice(0, 2)
    .map((line) => line.label);
}

/** "STA Fashion", "STA/Crit Fashion" (the two dominant blessings) or "Clean Fashion" without any. */
export function autoFashionSetName(data: GameData, entry: FashionSetEntry): string {
  const stats = dominantBlessingStats(data, entry);

  return stats.length === 0 ? 'Clean Fashion' : joinWords([stats.join('/'), 'Fashion']);
}

/** "Unicorn Corral" / "Rabbit Coop" -> "Unicorn" / "Rabbit". */
export function petShortName(name: string): string {
  return name.replace(/ (?:Cage|Corral|Coop)$/, '');
}

export function autoPetName(data: GameData, entry: PetEntry): string {
  const def = data.pets.find((pet) => pet.petItemId === entry.petItemId);
  let name = 'Pet';

  if (def !== undefined) {
    const maxTotal = reachablePetTotals(def)[0];

    if (entry.total === maxTotal) {
      // A fully raised pet (every tier at its best level) is simply "Perfect Unicorn".
      name = `Perfect ${petShortName(def.name)}`;
    } else {
      name = `${formatAbility(data, def.parameter, entry.total, def.rate)} pet`;
    }
  }

  return name;
}

export function displayName(customName: string | undefined, autoName: string): string {
  const trimmed = customName?.trim() ?? '';

  return trimmed === '' ? autoName : trimmed;
}

function swapPart(name: string | undefined, fallback: string): string {
  return name ?? fallback;
}

/**
 * "Etranar / Oracle / Adept's / Fashion 10% / Page 1 / Angel" — equipment, weapon, accessory set,
 * fashion set, stat page and pet; the accessory/fashion/pet segments are skipped when the slot is
 * empty. Falls back to "Swap N" for an empty swap.
 */
export function autoGearSwapName(data: GameData, build: BuildState, swap: GearSwap): string {
  const equipment = build.equipmentSets.find((entry) => entry.id === swap.equipmentSetId);
  const weapon = build.weapons.find((entry) => entry.id === swap.weaponId);
  const accessory = build.accessorySets.find((entry) => entry.id === swap.accessorySetId);
  const fashion = build.fashionSets.find((entry) => entry.id === swap.fashionSetId);
  const pet = build.pets.find((entry) => entry.id === swap.petId);
  const page = build.statPages.find((entry) => entry.id === swap.statPageId);
  const set =
    equipment?.setId === undefined || equipment.setId === null
      ? undefined
      : data.armorSets.get(equipment.setId);
  const weaponItem: SlimItem | undefined =
    weapon?.itemId === undefined || weapon.itemId === null
      ? undefined
      : getItem(data, weapon.itemId);
  const accessorySet = data.accessorySets.find((candidate) => candidate.id === accessory?.setId);
  const petDef = data.pets.find((candidate) => candidate.petItemId === pet?.petItemId);
  const index = build.gearSwaps.findIndex((candidate) => candidate.id === swap.id);
  let name = `Swap ${index + 1}`;

  const anyPick =
    set !== undefined ||
    weaponItem !== undefined ||
    accessorySet !== undefined ||
    fashion !== undefined ||
    petDef !== undefined;

  if (anyPick) {
    const pageName =
      page === undefined ? '—' : displayName(page.customName, autoStatPageName(build, page));
    const parts = [
      swapPart(set === undefined ? undefined : armorSetShortName(set.name), '—'),
      swapPart(weaponItem === undefined ? undefined : itemShortName(weaponItem.name), '—'),
    ];

    if (accessorySet !== undefined) {
      parts.push(accessorySetShortName(accessorySet.name));
    }

    if (fashion !== undefined) {
      parts.push(displayName(fashion.customName, autoFashionSetName(data, fashion)));
    }

    parts.push(pageName);

    if (petDef !== undefined) {
      parts.push(petShortName(petDef.name));
    }

    name = parts.join(' / ');
  }

  return name;
}
