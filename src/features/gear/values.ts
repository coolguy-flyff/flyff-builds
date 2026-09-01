import type { ValueBounds } from '@/domain/rules';
import { roundTo } from '@/lib/math';

const GRID_EPSILON = 1e-9;

/** Every value on the `min + k·step` grid up to `max`, for snapping sliders. */
export function stepValues(bounds: ValueBounds): number[] {
  const values: number[] = [];
  const count = Math.floor((bounds.max - bounds.min) / bounds.step + GRID_EPSILON);

  for (let index = 0; index <= count; index += 1) {
    values.push(roundTo(bounds.min + index * bounds.step, 4));
  }

  return values;
}

/** The option closest to `value` (ties resolve to the lower option); undefined for no options. */
export function nearestValue(options: readonly number[], value: number): number | undefined {
  let best: number | undefined;
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const option of options) {
    const distance = Math.abs(option - value);

    if (distance < bestDistance) {
      best = option;
      bestDistance = distance;
    }
  }

  return best;
}
