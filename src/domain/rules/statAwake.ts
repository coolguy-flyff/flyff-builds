import { STAT_KEYS, type GameData, type StatAwakeDef, type StatKey } from '@/data';
import { memoByRef, memoByRefAndKey } from '@/lib/memo';

import type { SetStatAwake, StatAwake, StatAwakeLine } from '../build/schema';

/**
 * Stat awakes come from StatAwakes.json: single-stat entries (+1…+4) and two-stat entries with
 * constrained value pairs. These helpers expose the valid combinations so the UI never offers an
 * impossible awake (port of Flyffulator flyffutils.js:359-429, data-driven).
 */

export interface StatAwakeCombo {
  readonly first: StatAwakeLine;
  readonly second: StatAwakeLine | null;
  readonly title: string;
}

function comboFromDef(def: StatAwakeDef): StatAwakeCombo | undefined {
  const [first, second] = def.abilities;
  let combo: StatAwakeCombo | undefined;

  if (first !== undefined && def.abilities.length <= 2) {
    combo = {
      first: { stat: first.parameter, value: first.add },
      second: second === undefined ? null : { stat: second.parameter, value: second.add },
      title: def.title,
    };
  }

  return combo;
}

/** Every valid awake, in table order; two-line entries appear in their table orientation. */
export const statAwakeCombos = memoByRef((data: GameData): readonly StatAwakeCombo[] => {
  const combos: StatAwakeCombo[] = [];

  for (const def of data.statAwakes) {
    const combo = comboFromDef(def);

    if (combo !== undefined) {
      combos.push(combo);
    }
  }

  return combos;
});

function sameLine(a: StatAwakeLine | null, b: StatAwakeLine | null): boolean {
  return a === null || b === null ? a === b : a.stat === b.stat && a.value === b.value;
}

/** Whether the pair of lines matches a table entry in either orientation. */
export function isValidStatAwake(data: GameData, awake: StatAwake): boolean {
  const [a, b] = awake;
  let valid = a === null && b === null;

  if (!valid) {
    valid = statAwakeCombos(data).some(
      (combo) =>
        (sameLine(combo.first, a) && sameLine(combo.second, b)) ||
        (sameLine(combo.first, b) && sameLine(combo.second, a)),
    );
  }

  return valid;
}

/** Stats that can share an item with `stat` on the other line. */
export function statAwakePartnerOptions(data: GameData, stat: StatKey): readonly StatKey[] {
  const partners = new Set<StatKey>();

  for (const { first, second } of statAwakeCombos(data)) {
    if (second === null) {
      continue;
    }

    if (first.stat === stat) {
      partners.add(second.stat);
    } else if (second.stat === stat) {
      partners.add(first.stat);
    }
  }

  return [...partners];
}

/**
 * Values `stat` may take given the other line (`null` = single-line awake). Mirrors
 * flyffutils.js:397-429.
 */
export function statAwakeValueOptions(
  data: GameData,
  stat: StatKey,
  other: StatAwakeLine | null,
): readonly number[] {
  const values = new Set<number>();

  for (const { first, second } of statAwakeCombos(data)) {
    if (other === null) {
      if (second === null && first.stat === stat) {
        values.add(first.value);
      }
    } else if (second !== null) {
      if (first.stat === stat && second.stat === other.stat && second.value === other.value) {
        values.add(first.value);
      } else if (second.stat === stat && first.stat === other.stat && first.value === other.value) {
        values.add(second.value);
      }
    }
  }

  return [...values].sort((x, y) => x - y);
}

/** Sum of an awake's lines per stat, multiplied by `pieces` (4 for an armor set). */
export function statAwakeTotals(awake: StatAwake, pieces = 1): Partial<Record<StatKey, number>> {
  const totals: Partial<Record<StatKey, number>> = {};

  for (const line of awake) {
    if (line !== null) {
      totals[line.stat] = (totals[line.stat] ?? 0) + line.value * pieces;
    }
  }

  return totals;
}

// --- equipment-set awakes as overall totals -------------------------------------------------
//
// An armor set has four pieces, each with its own awake; the applied bonus is the sum. The exact
// per-piece distribution is irrelevant (2/2/2/3 vs 3/2/2/2), so equipment sets store only the
// totals: a first stat with a 1–16 total and an optional second stat whose reachable totals
// follow from distributing valid per-piece awakes (singles and valid pairs) over the pieces.

export const SET_AWAKE_PIECES = 4;
export const SET_AWAKE_MAX_TOTAL = 16;

interface PieceOption {
  readonly first: number;
  readonly second: number;
}

/** What one piece can contribute to an ordered stat pair: nothing, a single of either, or a pair. */
function pieceOptions(data: GameData, first: StatKey, second: StatKey): PieceOption[] {
  const options: PieceOption[] = [{ first: 0, second: 0 }];

  for (const value of statAwakeValueOptions(data, first, null)) {
    options.push({ first: value, second: 0 });
  }

  for (const value of statAwakeValueOptions(data, second, null)) {
    options.push({ first: 0, second: value });
  }

  for (const combo of statAwakeCombos(data)) {
    if (combo.second === null) {
      continue;
    }

    if (combo.first.stat === first && combo.second.stat === second) {
      options.push({ first: combo.first.value, second: combo.second.value });
    } else if (combo.first.stat === second && combo.second.stat === first) {
      options.push({ first: combo.second.value, second: combo.first.value });
    }
  }

  return options;
}

/** first total → sorted second totals reachable across the four pieces, for one ordered pair. */
const pairTotals = memoByRefAndKey(
  (data: GameData, key: string): ReadonlyMap<number, readonly number[]> => {
    const [first, second] = key.split(':') as [StatKey, StatKey];
    const options = pieceOptions(data, first, second);
    let states = new Set<number>([0]);

    // Encode (firstTotal, secondTotal) as firstTotal * 64 + secondTotal; both stay well below 64.
    for (let piece = 0; piece < SET_AWAKE_PIECES; piece += 1) {
      const next = new Set<number>();

      for (const state of states) {
        for (const option of options) {
          next.add(state + option.first * 64 + option.second);
        }
      }

      states = next;
    }

    const byFirst = new Map<number, number[]>();

    for (const state of states) {
      const firstTotal = Math.floor(state / 64);
      const seconds = byFirst.get(firstTotal) ?? [];
      seconds.push(state % 64);
      byFirst.set(firstTotal, seconds);
    }

    for (const seconds of byFirst.values()) {
      seconds.sort((a, b) => a - b);
    }

    return byFirst;
  },
);

/** Second-stat totals reachable next to `firstTotal` of `first` (0 is always included). */
export function setAwakeSecondTotals(
  data: GameData,
  first: StatKey,
  firstTotal: number,
  second: StatKey,
): readonly number[] {
  let totals: readonly number[] = [];

  if (first !== second) {
    totals = pairTotals(data, `${first}:${second}`).get(firstTotal) ?? [];
  }

  return totals;
}

/** Second stats that can still reach a non-zero total next to the first line. */
export function setAwakePartnerOptions(
  data: GameData,
  first: StatKey,
  firstTotal: number,
): readonly StatKey[] {
  return STAT_KEYS.filter(
    (stat) => stat !== first && setAwakeSecondTotals(data, first, firstTotal, stat).length > 1,
  );
}

export function isValidSetStatAwake(data: GameData, awake: SetStatAwake): boolean {
  const [first, second] = awake;
  let valid = false;

  if (first === null) {
    valid = second === null;
  } else if (first.value >= 1 && first.value <= SET_AWAKE_MAX_TOTAL) {
    if (second === null) {
      valid = true;
    } else {
      valid =
        second.stat !== first.stat &&
        second.value >= 1 &&
        setAwakeSecondTotals(data, first.stat, first.value, second.stat).includes(second.value);
    }
  }

  return valid;
}

/** Per-stat totals of a set awake (the lines already store totals). */
export function setAwakeTotals(awake: SetStatAwake): Partial<Record<StatKey, number>> {
  const totals: Partial<Record<StatKey, number>> = {};

  for (const line of awake) {
    if (line !== null) {
      totals[line.stat] = (totals[line.stat] ?? 0) + line.value;
    }
  }

  return totals;
}
