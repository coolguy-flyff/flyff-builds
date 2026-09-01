import type { RangeValue, RowFormat, RowValue } from './rowCatalog';

/**
 * Cell text for the results table and its exports (plan A4.1): integers with thousands separators,
 * percentages with up to two decimals, `min~max` ranges, and signed diffs.
 */

const NUMBER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

/** Typographic minus, matching the rest of the app's stat formatting. */
const MINUS = '−';
const PLUS = '+';
const ZERO_DIFF = '±0';
const RANGE_SEPARATOR = '~';
export const EMPTY_CELL = '—';

function unsigned(value: number): string {
  return NUMBER.format(Math.abs(value));
}

/** Formats the magnitude and prefixes a minus for negatives (never "−0"). */
function withSign(value: number, positivePrefix: string): string {
  const magnitude = unsigned(value);
  let prefix = '';

  if (magnitude !== '0') {
    prefix = value < 0 ? MINUS : positivePrefix;
  }

  return `${prefix}${magnitude}`;
}

export function formatInt(value: number): string {
  return withSign(value, '');
}

export function formatPercent(value: number): string {
  return `${withSign(value, '')}%`;
}

export function formatRange(range: RangeValue): string {
  return `${formatInt(range.min)}${RANGE_SEPARATOR}${formatInt(range.max)}`;
}

function formatScalar(value: number, format: RowFormat): string {
  return format === 'percent' ? formatPercent(value) : formatInt(value);
}

export function formatValue(value: RowValue, format: RowFormat): string {
  let text: string;

  if (value === null) {
    text = EMPTY_CELL;
  } else if (typeof value === 'number') {
    text = formatScalar(value, format);
  } else {
    text = formatRange(value);
  }

  return text;
}

function formatSignedScalar(delta: number, format: RowFormat): string {
  const magnitude = unsigned(delta);
  let text: string;

  if (magnitude === '0') {
    text = ZERO_DIFF;
  } else {
    text = `${delta < 0 ? MINUS : PLUS}${magnitude}`;
  }

  return format === 'percent' ? `${text}%` : text;
}

/**
 * A difference against the baseline column: `+Δ` / `−Δ`, `±0` for no change. Percentage rows show
 * percentage points; ranges show the min and max deltas.
 */
export function formatDiff(diff: RowValue, format: RowFormat): string {
  let text: string;

  if (diff === null) {
    text = EMPTY_CELL;
  } else if (typeof diff === 'number') {
    text = formatSignedScalar(diff, format);
  } else if (diff.min === 0 && diff.max === 0) {
    text = ZERO_DIFF;
  } else {
    text = `${formatSignedScalar(diff.min, 'int')}${RANGE_SEPARATOR}${formatSignedScalar(diff.max, 'int')}`;
  }

  return text;
}
