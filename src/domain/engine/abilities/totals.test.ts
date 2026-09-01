import { describe, expect, it } from 'vitest';

import { origin } from './collect';
import { expandTargetStats } from './targetStats';
import { buildTotalsIndex, collectRawTotals, sumStatTotal } from './totals';
import type { Contribution } from './types';

function line(
  parameter: string,
  add: number,
  rate: boolean,
  match: Contribution['match'] = 'union',
): Contribution {
  return { parameter, add, rate, match, origin: origin('mainhand', 'test') };
}

describe('target-stat unions', () => {
  it('mirrors flyffentity.js:1148-1169', () => {
    expect(expandTargetStats('str')).toEqual(['str', 'allstats']);
    expect(expandTargetStats('firemastery')).toEqual(['firemastery', 'allelementsmastery']);
    expect(expandTargetStats('winddefense')).toEqual(['winddefense', 'allelementsdefense']);
    expect(expandTargetStats('decreasedcastingtime')).toEqual(['decreasedcastingtime', 'allspeed']);
    expect(expandTargetStats('rangedblock')).toEqual(['rangedblock', 'block']);
    expect(expandTargetStats('block')).toEqual(['block']);
    expect(expandTargetStats('maxhp')).toEqual(['maxhp']);
  });
});

describe('stat totals', () => {
  it('rounds away floating-point noise like Entity.getStat', () => {
    const index = buildTotalsIndex([
      line('criticalchance', 0.1, true),
      line('criticalchance', 0.2, true),
    ]);

    expect(sumStatTotal(index, 'criticalchance', true)).toBe(0.3);
  });

  it('applies unions to union contributions only', () => {
    const index = buildTotalsIndex([
      line('allstats', 10, false),
      line('str', 5, false),
      line('block', 14, true),
      line('meleeblock', 3, true),
      line('block', 15, true, 'exact'),
    ]);

    expect(sumStatTotal(index, 'str', false)).toBe(15);
    expect(sumStatTotal(index, 'dex', false)).toBe(10);
    expect(sumStatTotal(index, 'allstats', false)).toBe(10);
    // A skill awake counts for `block` but not for `meleeblock` (flyffentity.js:1217-1221).
    expect(sumStatTotal(index, 'block', true)).toBe(29);
    expect(sumStatTotal(index, 'meleeblock', true)).toBe(17);
    expect(sumStatTotal(index, 'rangedblock', true)).toBe(14);
    expect(sumStatTotal(index, 'block', false)).toBe(0);
  });

  it('separates flat and rate sums of the same parameter', () => {
    const index = buildTotalsIndex([line('maxhp', 1000, false), line('maxhp', 35, true)]);

    expect(sumStatTotal(index, 'maxhp', false)).toBe(1000);
    expect(sumStatTotal(index, 'maxhp', true)).toBe(35);
  });

  it('lists raw totals per parameter without unions, dropping zero sums', () => {
    const index = buildTotalsIndex([
      line('allstats', 10, false),
      line('speed', 5, true),
      line('speed', -5, true),
      line('block', 15, true, 'exact'),
    ]);

    expect(collectRawTotals(index)).toEqual({
      allstats: { flat: 10, rate: 0 },
      block: { flat: 0, rate: 15 },
    });
  });
});
