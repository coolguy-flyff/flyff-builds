import { describe, expect, it } from 'vitest';

import { nearestValue, stepValues } from './values';

describe('stepValues', () => {
  it('walks the step grid from the weakest roll to the strongest', () => {
    expect(stepValues({ min: 3.5, max: 4, step: 0.1, inverted: false })).toEqual([
      3.5, 3.6, 3.7, 3.8, 3.9, 4,
    ]);
    // A reduction such as incoming damage -6…-10 ends on -10, the strongest roll.
    expect(stepValues({ min: -10, max: -6, step: 1, inverted: true })).toEqual([
      -6, -7, -8, -9, -10,
    ]);
  });
});

describe('nearestValue', () => {
  it('snaps to the closest option, the lower one on ties', () => {
    expect(nearestValue([1, 2, 4], 3.4)).toBe(4);
    expect(nearestValue([1, 2, 4], 3)).toBe(2);
    expect(nearestValue([], 3)).toBeUndefined();
  });
});
