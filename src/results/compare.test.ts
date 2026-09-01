import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import {
  createDefaultBuild,
  createGearSwap,
  createWeaponEntry,
  withWeaponItem,
} from '@/domain/build';
import { computeAllResults } from '@/domain/engine';
import { requireDefined } from '@/lib/assert';

import {
  bestColumns,
  compareValues,
  diffValue,
  filterDifferingRows,
  rowDiffers,
  rowValues,
  valuesEqual,
} from './compare';
import { buildRows } from './rowCatalog';
import { makePage } from './testing/fixtures';

const data = loadBundledGameData();
const ORACLE = 54987;

describe('compareValues', () => {
  it('orders numbers, ranges by midpoint then max, and nulls last', () => {
    expect(compareValues(1, 2)).toBeLessThan(0);
    expect(compareValues(2, 2)).toBe(0);
    expect(compareValues({ min: 500, max: 700 }, { min: 561, max: 561 })).toBeGreaterThan(0);
    expect(compareValues({ min: 100, max: 200 }, { min: 50, max: 250 })).toBeLessThan(0);
    expect(compareValues({ min: 100, max: 200 }, 150)).toBeGreaterThan(0);
    expect(compareValues({ min: 100, max: 200 }, 200)).toBeLessThan(0);
    expect(compareValues(null, -1000)).toBeLessThan(0);
    expect(compareValues(null, null)).toBe(0);
  });
});

describe('valuesEqual', () => {
  it('compares by value, including ranges', () => {
    expect(valuesEqual(5, 5)).toBe(true);
    expect(valuesEqual({ min: 1, max: 2 }, { min: 1, max: 2 })).toBe(true);
    expect(valuesEqual({ min: 1, max: 2 }, { min: 1, max: 3 })).toBe(false);
    expect(valuesEqual(3, { min: 3, max: 3 })).toBe(false);
    expect(valuesEqual(null, null)).toBe(true);
    expect(valuesEqual(null, 0)).toBe(false);
  });
});

describe('bestColumns', () => {
  it('marks the highest or lowest column depending on the row direction', () => {
    expect(bestColumns([217, 2424], true)).toEqual([false, true]);
    expect(bestColumns([10, 5], false)).toEqual([false, true]);
  });

  it('marks every tied column but nothing when all columns are tied', () => {
    expect(bestColumns([5, 5, 3], true)).toEqual([true, true, false]);
    expect(bestColumns([5, 5], true)).toEqual([false, false]);
    expect(bestColumns([5], true)).toEqual([false]);
  });

  it('ignores missing values and needs at least two present columns', () => {
    expect(bestColumns([null, 5], true)).toEqual([false, false]);
    expect(bestColumns([null, 5, 7], true)).toEqual([false, false, true]);
  });

  it('compares ranges by midpoint and breaks ties by max', () => {
    expect(
      bestColumns(
        [
          { min: 561, max: 561 },
          { min: 500, max: 700 },
        ],
        true,
      ),
    ).toEqual([false, true]);
    expect(
      bestColumns(
        [
          { min: 100, max: 200 },
          { min: 50, max: 250 },
        ],
        true,
      ),
    ).toEqual([false, true]);
  });
});

describe('diffValue', () => {
  it('subtracts the baseline per shape and yields null for mismatches', () => {
    expect(diffValue(2424, 217)).toBe(2207);
    expect(diffValue({ min: 1722, max: 1727 }, { min: 561, max: 561 })).toEqual({
      min: 1161,
      max: 1166,
    });
    expect(diffValue(null, 5)).toBeNull();
    expect(diffValue(5, { min: 1, max: 2 })).toBeNull();
  });
});

describe('rowDiffers / filterDifferingRows', () => {
  it('flags a row when any column differs from the first', () => {
    expect(rowDiffers([1, 1, 1])).toBe(false);
    expect(rowDiffers([1, 1, 2])).toBe(true);
    expect(
      rowDiffers([
        { min: 1, max: 2 },
        { min: 1, max: 2 },
      ]),
    ).toBe(false);
    expect(rowDiffers([])).toBe(false);
  });

  it('keeps only the rows whose values differ across columns', () => {
    const base = makePage();
    const stronger = makePage({ attack: 2424, defenseMax: 600 });
    const rows = buildRows(data, [{ page: base }, { page: stronger }], { showRawTotals: false });

    expect(filterDifferingRows(rows, [base, base])).toEqual([]);
    expect(filterDifferingRows(rows, [base, stronger]).map((row) => row.id)).toEqual([
      'attack',
      'defense',
    ]);
    expect(rowValues(requireDefined(rows[0], 'STR row'), [base, stronger])).toEqual([15, 15]);
  });

  it('works on real engine output', () => {
    const build = createDefaultBuild(data);
    const page = build.statPages[0];
    const weapon = withWeaponItem(data, createWeaponEntry(10), ORACLE);

    build.weapons.push(weapon);
    build.gearSwaps.push(createGearSwap(11, page?.id ?? 1));

    const identical = computeAllResults(data, build);
    const rows = buildRows(data, identical, { showRawTotals: false });
    const pagesOf = (results: typeof identical) => results.map((result) => result.page);

    expect(filterDifferingRows(rows, pagesOf(identical))).toEqual([]);

    const first = build.gearSwaps[0];

    if (first !== undefined) {
      first.weaponId = weapon.id;
    }

    const differing = computeAllResults(data, build);
    const ids = filterDifferingRows(rows, pagesOf(differing)).map((row) => row.id);
    const attack = requireDefined(
      rows.find((row) => row.id === 'attack'),
      'Attack row',
    );

    expect(ids).toContain('attack');
    expect(ids).not.toContain('hp');
    expect(bestColumns(rowValues(attack, pagesOf(differing)), true)).toEqual([true, false]);
  });
});
