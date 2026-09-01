import type { PetDef } from '@/data';
import { memoByRef } from '@/lib/memo';

/** Raised-pet tiers F→S and how many level choices each offers (flyffutils.js:250-261). */
export const PET_TIERS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'] as const;
export type PetTier = (typeof PET_TIERS)[number];
export const PET_TIER_OPTION_COUNTS: Readonly<Record<PetTier, number>> = {
  F: 1,
  E: 2,
  D: 3,
  C: 4,
  B: 5,
  A: 7,
  S: 9,
};

/** Tiers are raised as a prefix (F, then E, …); each raised tier adds `values[level − 1]`. */
export function petStatSum(def: PetDef, levels: readonly number[]): number {
  let total = 0;

  for (const level of levels) {
    total += def.values[level - 1] ?? 0;
  }

  return total;
}

interface Enumeration {
  readonly totals: readonly number[];
  readonly breakdowns: ReadonlyMap<number, readonly number[]>;
}

/**
 * Enumerates every reachable total (≤ 7,560 combinations) and remembers one representative
 * level combination per total. Prefixes are visited shortest first and levels ascending, so the
 * representative uses the fewest raised tiers and, among those, the lowest levels.
 */
const enumerate = memoByRef((def: PetDef): Enumeration => {
  const breakdowns = new Map<number, readonly number[]>();

  const visit = (tierIndex: number, prefixLength: number, levels: number[]): void => {
    if (tierIndex === prefixLength) {
      const total = petStatSum(def, levels);

      if (!breakdowns.has(total)) {
        breakdowns.set(total, [...levels]);
      }

      return;
    }

    const tier = PET_TIERS[tierIndex];

    if (tier === undefined) {
      return;
    }

    for (let level = 1; level <= PET_TIER_OPTION_COUNTS[tier]; level += 1) {
      levels.push(level);
      visit(tierIndex + 1, prefixLength, levels);
      levels.pop();
    }
  };

  for (let prefixLength = 1; prefixLength <= PET_TIERS.length; prefixLength += 1) {
    visit(0, prefixLength, []);
  }

  const totals = [...breakdowns.keys()].sort((a, b) => b - a);

  return { totals, breakdowns };
});

/** Every reachable total for the pet, sorted descending. */
export function reachablePetTotals(def: PetDef): readonly number[] {
  return enumerate(def).totals;
}

/** A representative per-tier level list reaching `total`, or undefined when unreachable. */
export function petTierBreakdown(def: PetDef, total: number): readonly number[] | undefined {
  return enumerate(def).breakdowns.get(total);
}

export function isReachablePetTotal(def: PetDef, total: number): boolean {
  return enumerate(def).breakdowns.has(total);
}
