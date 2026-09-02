import type { Ability, SlimItem } from '@/data';
import { isOnStep } from '@/lib/math';

/** Value granularity per stat for ranged abilities and ultimate random stats (itemedit.jsx:12-19). */
export const STAT_STEPS: Readonly<Record<string, number>> = {
  stealhp: 0.1,
  attack: 0.1,
  criticaldamage: 0.1,
  criticalchance: 0.1,
  attackspeed: 0.05,
  blockpenetration: 0.1,
};

export function stepFor(parameter: string): number {
  return STAT_STEPS[parameter] ?? 1;
}

/** Halves a value on its step grid, rounding down (itemedit.jsx:21-35, same operation order). */
export function halfStat(parameter: string, value: number): number {
  const step = stepFor(parameter);

  return Math.floor(value / step / 2) * step;
}

export interface ValueBounds {
  readonly min: number;
  readonly max: number;
  readonly step: number;
  /** The strongest roll is `min`: reductions such as incoming damage run `-6…-10`. */
  readonly inverted: boolean;
}

/**
 * Ranged ability (`add…addMax`) bounds; Flyffulator's default is the floored midpoint. The data
 * lists the weakest roll first, so a range that counts down is an inverted (reduction) range.
 */
export function statRangeBounds(ability: Ability): ValueBounds {
  const max = ability.addMax ?? ability.add;

  return {
    min: Math.min(ability.add, max),
    max: Math.max(ability.add, max),
    step: stepFor(ability.parameter),
    inverted: max < ability.add,
  };
}

/** The best roll within the bounds: the top of the range, or its bottom for inverted ones. */
export function strongestValue(bounds: ValueBounds): number {
  return bounds.inverted ? bounds.min : bounds.max;
}

export function defaultStatRangeValue(ability: Ability): number {
  const max = ability.addMax ?? ability.add;

  return Math.floor(ability.add + (max - ability.add) / 2);
}

export function rangedAbilities(item: SlimItem): readonly Ability[] {
  return (item.abilities ?? []).filter((ability) => ability.addMax !== undefined);
}

/** Lines 1–2 always; line 3 unlocks at +6, line 4 at +10 (itemedit.jsx:258-282). */
export function randomStatLineCount(upgrade: number): number {
  let count = 2;

  if (upgrade >= 6) {
    count = 3;
  }

  if (upgrade >= 10) {
    count = 4;
  }

  return count;
}

export function hasRandomStats(item: SlimItem): boolean {
  return item.rarity === 'ultimate' && (item.possibleRandomStats?.length ?? 0) >= 2;
}

/** Lines 3 and 4 use halved ranges. */
export function randomStatBounds(ability: Ability, lineIndex: number): ValueBounds {
  const bounds = statRangeBounds(ability);
  let result = bounds;

  if (lineIndex >= 2) {
    result = {
      min: halfStat(ability.parameter, bounds.min),
      max: halfStat(ability.parameter, bounds.max),
      step: bounds.step,
      inverted: bounds.inverted,
    };
  }

  return result;
}

export function defaultRandomStatValue(ability: Ability, lineIndex: number): number {
  const midpoint = defaultStatRangeValue(ability);

  return lineIndex >= 2 ? halfStat(ability.parameter, midpoint) : midpoint;
}

export function isWithinBounds(value: number, bounds: ValueBounds, epsilon = 1e-9): boolean {
  return (
    value >= bounds.min - epsilon &&
    value <= bounds.max + epsilon &&
    isOnStep(value, bounds.min, bounds.step, epsilon)
  );
}
