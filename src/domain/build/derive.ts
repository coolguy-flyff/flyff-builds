import type { GameData, SlimItem } from '@/data';
import { getItem } from '@/data';

import {
  defaultRandomStatValue,
  defaultStatRangeValue,
  hasRandomStats,
  isValidSkillAwake,
  piercingSlots,
  randomStatLineCount,
  rangedAbilities,
} from '../rules';

import {
  LIMITS,
  type RandomStatLine,
  type ShieldEntry,
  type Stack,
  type WeaponEntry,
} from './schema';

/**
 * Item-driven derivations for weapon/shield entries: when the item or upgrade changes, the
 * dependent fields (stat ranges, random-stat lines, skill awake, card capacity) are re-derived
 * here so the store and the validator share one implementation.
 */

/** Trims stacks from the end so their total count fits `capacity`. */
export function trimStacks(stacks: readonly Stack[], capacity: number): Stack[] {
  const trimmed: Stack[] = [];
  let remaining = capacity;

  for (const stack of stacks) {
    if (remaining <= 0) {
      break;
    }

    const count = Math.min(stack.count, remaining);
    trimmed.push({ itemId: stack.itemId, count });
    remaining -= count;
  }

  return trimmed;
}

export function defaultStatRanges(item: SlimItem): number[] {
  return rangedAbilities(item).map(defaultStatRangeValue);
}

/** Default random-stat lines for an ultimate weapon: i-th possible stat at its (halved) midpoint. */
export function defaultRandomStatLines(item: SlimItem, upgrade: number): (RandomStatLine | null)[] {
  const lines: (RandomStatLine | null)[] = [];

  if (hasRandomStats(item)) {
    const possible = item.possibleRandomStats ?? [];
    const count = randomStatLineCount(upgrade);

    for (let index = 0; index < count; index += 1) {
      const ability = possible[index];
      lines.push(
        ability === undefined
          ? null
          : { parameter: ability.parameter, value: defaultRandomStatValue(ability, index) },
      );
    }
  }

  return lines;
}

/**
 * Fills newly unlocked random-stat lines with defaults while keeping stored (locked) lines.
 * Lines whose parameter is already used elsewhere default to the next unused possible stat.
 */
export function fillRandomStatLines(
  item: SlimItem,
  upgrade: number,
  existing: readonly (RandomStatLine | null)[],
): (RandomStatLine | null)[] {
  const lines: (RandomStatLine | null)[] = [];

  if (hasRandomStats(item)) {
    const possible = item.possibleRandomStats ?? [];
    const count = Math.max(existing.length, randomStatLineCount(upgrade));
    const used = new Set(existing.flatMap((line) => (line === null ? [] : [line.parameter])));

    for (let index = 0; index < Math.min(count, LIMITS.randomStatLines); index += 1) {
      const current = existing[index] ?? null;

      if (current !== null) {
        lines.push(current);
        continue;
      }

      const ability = possible.find((candidate) => !used.has(candidate.parameter));

      if (ability === undefined) {
        lines.push(null);
      } else {
        used.add(ability.parameter);
        lines.push({ parameter: ability.parameter, value: defaultRandomStatValue(ability, index) });
      }
    }
  }

  return lines;
}

/** Applies a weapon item: derives ranges/random lines, drops an invalid skill awake, trims cards. */
export function withWeaponItem(
  data: GameData,
  entry: WeaponEntry,
  itemId: number | null,
): WeaponEntry {
  const item = itemId === null ? undefined : getItem(data, itemId);
  let next: WeaponEntry;

  if (item === undefined) {
    next = { ...entry, itemId: null, statRanges: [], randomStats: [], skillAwake: null };
  } else {
    const skillAwakeValid =
      entry.skillAwake !== null && isValidSkillAwake(data, item, entry.skillAwake);

    next = {
      ...entry,
      itemId,
      statRanges: defaultStatRanges(item),
      randomStats: defaultRandomStatLines(item, entry.upgrade),
      skillAwake: skillAwakeValid ? entry.skillAwake : null,
      cards: trimStacks(entry.cards, piercingSlots(item)),
    };
  }

  return next;
}

export function withWeaponUpgrade(
  data: GameData,
  entry: WeaponEntry,
  upgrade: number,
): WeaponEntry {
  const item = entry.itemId === null ? undefined : getItem(data, entry.itemId);
  let randomStats = entry.randomStats;

  if (item !== undefined) {
    // Newly unlocked lines get defaults; lowering the upgrade clears the lines it locks.
    randomStats = fillRandomStatLines(item, upgrade, entry.randomStats).slice(
      0,
      randomStatLineCount(upgrade),
    );
  }

  return { ...entry, upgrade, randomStats };
}

export function withShieldItem(
  data: GameData,
  entry: ShieldEntry,
  itemId: number | null,
): ShieldEntry {
  const item = itemId === null ? undefined : getItem(data, itemId);
  let next: ShieldEntry;

  if (item === undefined) {
    next = { ...entry, itemId: null, skillAwake: null };
  } else {
    const skillAwakeValid =
      entry.skillAwake !== null && isValidSkillAwake(data, item, entry.skillAwake);

    next = {
      ...entry,
      itemId,
      skillAwake: skillAwakeValid ? entry.skillAwake : null,
      cards: trimStacks(entry.cards, piercingSlots(item)),
    };
  }

  return next;
}
