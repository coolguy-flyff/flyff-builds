import { getItem, getStatName, type Ability, type GameData, type SlimItem } from '@/data';
import { roundTo } from '@/lib/math';

import { reachablePetTotals, setAwakeTotals, statAwakeTotals } from '../rules';

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
 * Auto-generated entry names (plan A5.1, revised 2026-09-01). Names are pure functions of data +
 * entry; a custom name always wins. Segments are joined with " · " and omitted when empty.
 * Weapons and shields are named by their overall stat totals (awake + cards + jewels), with runes
 * summarised as "N Runes"; accessory sets by their upgrade signature (r1 e1 necklace e2 r2).
 */

const SEPARATOR = ' · ';

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
  decreasedmpconsumption: 'MP cost',
  decreasedfpconsumption: 'FP cost',
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

function joinSegments(segments: readonly (string | null | undefined)[]): string {
  return segments
    .filter((segment): segment is string => typeof segment === 'string' && segment !== '')
    .join(SEPARATOR);
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

function stackTotalsSegment(data: GameData, stacks: readonly Stack[]): string | null {
  const totals = stackTotals(data, stacks).map((ability) =>
    formatAbility(data, ability.parameter, ability.add, ability.rate),
  );

  return totals.length === 0 ? null : totals.join(SEPARATOR);
}

export function autoStatPageName(build: BuildState, page: StatPage): string {
  const index = build.statPages.findIndex((candidate) => candidate.id === page.id);

  return `Page ${index + 1}`;
}

function setAwakeSegment(entry: EquipmentSetEntry): string | null {
  const parts = Object.entries(setAwakeTotals(entry.statAwake)).map(
    ([stat, value]) => `${stat.toUpperCase()} +${value}`,
  );

  return parts.length === 0 ? null : parts.join(SEPARATOR);
}

export function autoEquipmentSetName(data: GameData, entry: EquipmentSetEntry): string {
  const set = entry.setId === null ? undefined : data.armorSets.get(entry.setId);
  const base =
    set === undefined ? 'Equipment set' : `${armorSetShortName(set.name)} +${entry.upgrade}`;

  return joinSegments([base, setAwakeSegment(entry), stackTotalsSegment(data, entry.suitCards)]);
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

  if (entry.skillAwake !== null && !entry.skillAwake.parameter.startsWith('skill:')) {
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

function weaponStatSegments(data: GameData, entry: WeaponEntry | ShieldEntry): (string | null)[] {
  const { totals, runeCount } = weaponStatSummary(data, entry);
  const segments: (string | null)[] = totals.map((total) =>
    formatAbility(data, total.parameter, total.add, total.rate),
  );

  segments.push(runeCount === 0 ? null : `${runeCount} Rune${runeCount === 1 ? '' : 's'}`);

  return segments;
}

export function autoWeaponName(data: GameData, entry: WeaponEntry): string {
  const item = entry.itemId === null ? undefined : getItem(data, entry.itemId);
  const base = item === undefined ? 'Weapon' : `${itemShortName(item.name)} +${entry.upgrade}`;

  return joinSegments([base, ...weaponStatSegments(data, entry)]);
}

export function autoShieldName(data: GameData, entry: ShieldEntry): string {
  const item = entry.itemId === null ? undefined : getItem(data, entry.itemId);
  const base = item === undefined ? 'Shield' : `${itemShortName(item.name)} +${entry.upgrade}`;

  return joinSegments([base, ...weaponStatSegments(data, entry)]);
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

export function autoAccessorySetName(data: GameData, entry: AccessorySetEntry): string {
  const set = data.accessorySets.find((candidate) => candidate.id === entry.setId);
  let name = 'Accessory set';

  if (set !== undefined) {
    const short = accessorySetShortName(set.name);
    const signature = accessoryUpgradeSignature(entry);

    // All pieces at +0 read better as "Clean Adept's" than "Adept's 00000".
    name = signature === '00000' ? `Clean ${short}` : `${short} ${signature}`;
  }

  return name;
}

export function autoFashionSetName(data: GameData, entry: FashionSetEntry): string {
  const blessings = entry.blessings.map((line) =>
    formatAbility(data, line.parameter, line.total, data.blessings[line.parameter]?.rate ?? false),
  );
  const [only] = blessings;
  let name;

  if (blessings.length === 1 && only !== undefined) {
    // A single blessing leads the name: "STA +40 Fashion 10%".
    name = `${only} Fashion ${entry.speedPercent}%`;
  } else {
    name = joinSegments([`Fashion ${entry.speedPercent}%`, ...blessings]);
  }

  return name;
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
