import type { GameData } from '@/data';
import { memoByRefAndKey } from '@/lib/memo';
import { roundTo } from '@/lib/math';

import type { BlessingLine } from '../build/schema';

export const BLESSING_SLOTS_PER_PIECE = 2;
export const FASHION_PIECES = 4;

/** A selected cloak adds a fifth blessed piece (2 more slots). */
export function blessingPieceCount(hasCloak: boolean): number {
  return FASHION_PIECES + (hasCloak ? 1 : 0);
}

export function blessingSlotCapacity(hasCloak: boolean): number {
  return blessingPieceCount(hasCloak) * BLESSING_SLOTS_PER_PIECE;
}

/** The largest capacity any fashion set can have (4 pieces + cloak). */
export const MAX_BLESSING_SLOTS = blessingSlotCapacity(true);

/** Values a single slot may hold (Blessings.json), excluding the empty 0. */
export function blessingSlotValues(data: GameData, parameter: string): readonly number[] {
  return (data.blessings[parameter]?.values ?? []).filter((value) => value > 0);
}

export function isRateBlessing(data: GameData, parameter: string): boolean {
  return data.blessings[parameter]?.rate ?? false;
}

interface Reachable {
  /** total → minimum number of slots needed */
  readonly minSlots: ReadonlyMap<number, number>;
  readonly totals: readonly number[];
}

/**
 * Subset sums over at most {@link MAX_BLESSING_SLOTS} picks of the per-slot values (repetition
 * allowed). Values are scaled to integers by their smallest step so float totals (crit 0.5) hash
 * cleanly.
 */
const reachable = memoByRefAndKey((data: GameData, parameter: string): Reachable => {
  const values = blessingSlotValues(data, parameter);
  const minSlots = new Map<number, number>();
  let frontier = new Map<number, number>([[0, 0]]);

  minSlots.set(0, 0);

  for (let slot = 1; slot <= MAX_BLESSING_SLOTS; slot += 1) {
    const next = new Map<number, number>();

    for (const total of frontier.keys()) {
      for (const value of values) {
        const sum = roundTo(total + value, 3);

        if (!minSlots.has(sum)) {
          minSlots.set(sum, slot);
          next.set(sum, slot);
        }
      }
    }

    frontier = next;
  }

  const totals = [...minSlots.keys()].sort((a, b) => a - b);

  return { minSlots, totals };
});

/** Every total reachable with at most `maxSlots` blessing slots, ascending (includes 0). */
export function reachableBlessingTotals(
  data: GameData,
  parameter: string,
  maxSlots: number = MAX_BLESSING_SLOTS,
): readonly number[] {
  const { minSlots, totals } = reachable(data, parameter);

  return maxSlots >= MAX_BLESSING_SLOTS
    ? totals
    : totals.filter((total) => (minSlots.get(total) ?? Number.POSITIVE_INFINITY) <= maxSlots);
}

/** Minimum slots needed to reach `total`; undefined when the total is not reachable at all. */
export function minBlessingSlots(
  data: GameData,
  parameter: string,
  total: number,
): number | undefined {
  return reachable(data, parameter).minSlots.get(roundTo(total, 3));
}

export function isReachableBlessingTotal(
  data: GameData,
  parameter: string,
  total: number,
): boolean {
  return minBlessingSlots(data, parameter, total) !== undefined;
}

/** Slots consumed by the lines (unreachable totals count as over-capacity to flag them). */
export function blessingSlotsUsed(data: GameData, lines: readonly BlessingLine[]): number {
  let used = 0;

  for (const line of lines) {
    used += minBlessingSlots(data, line.parameter, line.total) ?? MAX_BLESSING_SLOTS + 1;
  }

  return used;
}
