import { STAT_KEYS, type StatKey } from '@/data';

import { MIN_BASE_STAT, type StatPage } from '../build/schema';

/** Points earned by a character of `level` (flyffentity.js:453-459). */
export function totalStatPoints(level: number): number {
  return level * 2 - 2;
}

export function allocatedStatPoints(page: StatPage): number {
  let allocated = 0;

  for (const stat of STAT_KEYS) {
    allocated += page[stat] - MIN_BASE_STAT;
  }

  return allocated;
}

/** Negative when the page allocates more than the level provides. */
export function remainingStatPoints(level: number, page: StatPage): number {
  return totalStatPoints(level) - allocatedStatPoints(page);
}

/**
 * Each stat's share (0–1) of the page's allocated points: 1 for a "full" stat, 0 for an untouched
 * one, all 0 while nothing is allocated. Drives the collapsed card's highlight intensity.
 */
export function statPointShares(page: StatPage): Record<StatKey, number> {
  const allocated = allocatedStatPoints(page);
  const shares = { str: 0, sta: 0, dex: 0, int: 0 };

  if (allocated > 0) {
    for (const stat of STAT_KEYS) {
      shares[stat] = (page[stat] - MIN_BASE_STAT) / allocated;
    }
  }

  return shares;
}
