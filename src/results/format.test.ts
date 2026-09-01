import { describe, expect, it } from 'vitest';

import { formatDiff, formatInt, formatPercent, formatRange, formatValue } from './format';

describe('formatInt', () => {
  it('uses thousands separators and a typographic minus', () => {
    expect(formatInt(32450)).toBe('32,450');
    expect(formatInt(0)).toBe('0');
    expect(formatInt(-1234)).toBe('−1,234');
  });

  it('keeps up to two decimals for non-integer flat totals', () => {
    expect(formatInt(12.345)).toBe('12.35');
    expect(formatInt(-0.001)).toBe('0');
  });
});

describe('formatPercent', () => {
  it('appends a percent sign and rounds to two decimals', () => {
    expect(formatPercent(100)).toBe('100%');
    expect(formatPercent(6.25)).toBe('6.25%');
    expect(formatPercent(12.345)).toBe('12.35%');
    expect(formatPercent(-5)).toBe('−5%');
  });
});

describe('formatRange', () => {
  it('joins min and max with a tilde', () => {
    expect(formatRange({ min: 1722, max: 1727 })).toBe('1,722~1,727');
  });
});

describe('formatValue', () => {
  it('dispatches on the row format and shows a dash for missing values', () => {
    expect(formatValue(2424, 'int')).toBe('2,424');
    expect(formatValue(42, 'percent')).toBe('42%');
    expect(formatValue({ min: 561, max: 561 }, 'range')).toBe('561~561');
    expect(formatValue(null, 'int')).toBe('—');
  });
});

describe('formatDiff', () => {
  it('signs integer deltas and shows ±0 for no change', () => {
    expect(formatDiff(1200, 'int')).toBe('+1,200');
    expect(formatDiff(-7, 'int')).toBe('−7');
    expect(formatDiff(0, 'int')).toBe('±0');
  });

  it('shows percentage deltas in points', () => {
    expect(formatDiff(2.5, 'percent')).toBe('+2.5%');
    expect(formatDiff(-0.25, 'percent')).toBe('−0.25%');
    expect(formatDiff(0, 'percent')).toBe('±0%');
  });

  it('shows range deltas per bound', () => {
    expect(formatDiff({ min: 120, max: -3 }, 'range')).toBe('+120~−3');
    expect(formatDiff({ min: 0, max: 0 }, 'range')).toBe('±0');
    expect(formatDiff(null, 'range')).toBe('—');
  });
});
