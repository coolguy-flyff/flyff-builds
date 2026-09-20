import { describe, expect, it } from 'vitest';

import { clamp, isOnStep, mix, roundTo, sum } from './math';

describe('math helpers', () => {
  it('clamps into the range', () => {
    expect(clamp(5, 0, 3)).toBe(3);
    expect(clamp(-1, 0, 3)).toBe(0);
    expect(clamp(2, 0, 3)).toBe(2);
  });

  it('rounds floating-point noise away', () => {
    expect(roundTo(0.1 + 0.2, 3)).toBe(0.3);
  });

  it('checks a value against a step grid', () => {
    expect(isOnStep(2.5, 0, 0.5)).toBe(true);
    expect(isOnStep(2.4, 0, 0.5)).toBe(false);
  });

  it('interpolates linearly like Flyffulator’s mix', () => {
    expect(mix(100, 200, 0)).toBe(100);
    expect(mix(100, 200, 1)).toBe(200);
    expect(mix(100, 200, 0.25)).toBe(125);
  });

  it('sums', () => {
    expect(sum([1, 2, 3])).toBe(6);
    expect(sum([])).toBe(0);
  });
});
