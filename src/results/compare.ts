import type { ResultsPage } from '@/domain/engine';

import type { RangeValue, ResultsRow, RowValue } from './rowCatalog';

/**
 * Column comparisons for one row (plan A4.1): the best column(s), the diff against a baseline and
 * the "only differing rows" filter. Ranges compare by midpoint, then by max.
 */

type PresentValue = Exclude<RowValue, null>;

function isRange(value: PresentValue): value is RangeValue {
  return typeof value !== 'number';
}

function midpoint(value: PresentValue): number {
  return isRange(value) ? (value.min + value.max) / 2 : value;
}

function upperBound(value: PresentValue): number {
  return isRange(value) ? value.max : value;
}

/** Sort order of two cell values; `null` (not applicable) ranks below everything. */
export function compareValues(a: RowValue, b: RowValue): number {
  let order: number;

  if (a === null || b === null) {
    order = Number(a !== null) - Number(b !== null);
  } else {
    order = midpoint(a) - midpoint(b) || upperBound(a) - upperBound(b);
  }

  return order;
}

export function valuesEqual(a: RowValue, b: RowValue): boolean {
  let equal: boolean;

  if (a === null || b === null) {
    equal = a === b;
  } else if (isRange(a) && isRange(b)) {
    equal = a.min === b.min && a.max === b.max;
  } else if (!isRange(a) && !isRange(b)) {
    equal = a === b;
  } else {
    equal = false;
  }

  return equal;
}

/** Cell values of one row across the given columns. */
export function rowValues(row: ResultsRow, pages: readonly ResultsPage[]): RowValue[] {
  return pages.map((page) => row.select(page));
}

/**
 * Which columns hold the row's best value. Ties are all marked; nothing is marked when every
 * column is tied (there is no "best" without a worse alternative) or when fewer than two columns
 * have a value.
 */
export function bestColumns(values: readonly RowValue[], higherIsBetter: boolean): boolean[] {
  const direction = higherIsBetter ? 1 : -1;
  let best: RowValue = null;
  let present = 0;

  for (const value of values) {
    if (value === null) {
      continue;
    }

    present += 1;

    if (best === null || compareValues(value, best) * direction > 0) {
      best = value;
    }
  }

  const bestValue = best;
  const marks = values.map((value) => value !== null && compareValues(value, bestValue) === 0);
  const allTied = marks.every((mark, index) => mark || values[index] === null);
  let result = marks;

  if (present < 2 || allTied) {
    result = values.map(() => false);
  }

  return result;
}

/** `value − baseline`; `null` when either side is missing or the shapes disagree. */
export function diffValue(value: RowValue, baseline: RowValue): RowValue {
  let diff: RowValue = null;

  if (value !== null && baseline !== null) {
    if (isRange(value) && isRange(baseline)) {
      diff = { min: value.min - baseline.min, max: value.max - baseline.max };
    } else if (!isRange(value) && !isRange(baseline)) {
      diff = value - baseline;
    }
  }

  return diff;
}

/** A row differs when any column's value is not equal to the first column's. */
export function rowDiffers(values: readonly RowValue[]): boolean {
  const [first, ...rest] = values;

  return rest.some((value) => !valuesEqual(value, first ?? null));
}

export function filterDifferingRows(
  rows: readonly ResultsRow[],
  pages: readonly ResultsPage[],
): ResultsRow[] {
  return rows.filter((row) => rowDiffers(rowValues(row, pages)));
}
