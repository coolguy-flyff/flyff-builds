import type { DamageRange } from './types';

export function mapRange(range: DamageRange, fn: (value: number) => number): DamageRange {
  return { min: fn(range.min), max: fn(range.max) };
}

/** The single number a row shows for a range whose bounds are noise apart. */
export function rangeAverage(range: DamageRange): number {
  return Math.floor((range.min + range.max) / 2);
}
