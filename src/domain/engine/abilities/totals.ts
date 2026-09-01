import type { StatKey } from '@/data';
import { roundTo } from '@/lib/math';
import { memoByRef } from '@/lib/memo';

import type { ResolvedCharacter } from '../types';
import { expandTargetStats } from './targetStats';
import type { Contribution } from './types';

export interface StatBucket {
  readonly flat: number;
  readonly rate: number;
}

interface MutableBucket {
  flat: number;
  rate: number;
}

/** Per-parameter sums, split by matching mode (see {@link Contribution.match}). */
export interface StatTotalsIndex {
  readonly union: ReadonlyMap<string, StatBucket>;
  readonly exact: ReadonlyMap<string, StatBucket>;
}

/** Flyffulator rounds every total to three decimals to hide float noise (flyffentity.js:1541). */
const TOTAL_DECIMALS = 3;

function accumulate(buckets: Map<string, MutableBucket>, contribution: Contribution): void {
  let bucket = buckets.get(contribution.parameter);

  if (bucket === undefined) {
    bucket = { flat: 0, rate: 0 };
    buckets.set(contribution.parameter, bucket);
  }

  if (contribution.rate) {
    bucket.rate += contribution.add;
  } else {
    bucket.flat += contribution.add;
  }
}

export function buildTotalsIndex(contributions: readonly Contribution[]): StatTotalsIndex {
  const union = new Map<string, MutableBucket>();
  const exact = new Map<string, MutableBucket>();

  for (const contribution of contributions) {
    accumulate(contribution.match === 'exact' ? exact : union, contribution);
  }

  return { union, exact };
}

function bucketValue(bucket: StatBucket | undefined, rate: boolean): number {
  let value = 0;

  if (bucket !== undefined) {
    value = rate ? bucket.rate : bucket.flat;
  }

  return value;
}

/** `Entity.getStat` over an index: target-stat unions plus exact-only lines, rounded. */
export function sumStatTotal(index: StatTotalsIndex, parameter: string, rate: boolean): number {
  let total = 0;

  for (const target of expandTargetStats(parameter)) {
    total += bucketValue(index.union.get(target), rate);
  }

  total += bucketValue(index.exact.get(parameter), rate);

  return roundTo(total, TOTAL_DECIMALS);
}

/** Every parameter with a non-zero flat or rate sum (no union expansion), sorted by name. */
export function collectRawTotals(index: StatTotalsIndex): Readonly<Record<string, StatBucket>> {
  const merged = new Map<string, MutableBucket>();

  for (const buckets of [index.union, index.exact]) {
    for (const [parameter, bucket] of buckets) {
      const target = merged.get(parameter) ?? { flat: 0, rate: 0 };

      target.flat += bucket.flat;
      target.rate += bucket.rate;
      merged.set(parameter, target);
    }
  }

  const raw: Record<string, StatBucket> = {};

  for (const parameter of [...merged.keys()].sort()) {
    const bucket = merged.get(parameter);
    const flat = roundTo(bucket?.flat ?? 0, TOTAL_DECIMALS);
    const rate = roundTo(bucket?.rate ?? 0, TOTAL_DECIMALS);

    if (flat !== 0 || rate !== 0) {
      raw[parameter] = { flat, rate };
    }
  }

  return raw;
}

/** Index cached per resolved character (immutable, so identity is a safe key). */
const indexOf = memoByRef((resolved: ResolvedCharacter) =>
  buildTotalsIndex(resolved.contributions),
);

/** Total of `parameter` over the swap's contributions (flyffentity.js:1142-1543). */
export function getStatTotal(
  resolved: ResolvedCharacter,
  parameter: string,
  rate: boolean,
): number {
  return sumStatTotal(indexOf(resolved), parameter, rate);
}

/** Stat page value plus flat bonuses (flyffentity.js:670-677). */
export function getBaseStat(resolved: ResolvedCharacter, stat: StatKey): number {
  return resolved.statPage[stat] + getStatTotal(resolved, stat, false);
}

export function getRawTotals(resolved: ResolvedCharacter): Readonly<Record<string, StatBucket>> {
  return collectRawTotals(indexOf(resolved));
}
