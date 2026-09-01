import { STAT_KEYS } from '@/data';

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
