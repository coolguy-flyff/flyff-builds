import { describe, expect, it } from 'vitest';

import type { SnapshotMeta } from '@/persistence';

import { formatSavedAt, pluralize, snapshotMetaLine } from './format';

const meta: SnapshotMeta = {
  id: 'a',
  name: 'Before',
  savedAt: Date.UTC(2026, 7, 30, 12, 0),
  jobId: 26141,
  level: 190,
  swapCount: 4,
  automatic: false,
};

describe('snapshotMetaLine', () => {
  it('joins job, level, swaps and the saved-at time with middle dots', () => {
    expect(snapshotMetaLine('Seraph', meta)).toBe(
      `Seraph · Lv 190 · 4 swaps · ${formatSavedAt(meta.savedAt)}`,
    );
  });

  it('marks automatic snapshots and singular swaps', () => {
    expect(snapshotMetaLine('Seraph', { ...meta, swapCount: 1, automatic: true })).toMatch(
      /^Seraph · Lv 190 · 1 swap · .+ · automatic$/,
    );
  });
});

describe('pluralize', () => {
  it('appends an s except for exactly one', () => {
    expect([0, 1, 2].map((count) => pluralize(count, 'pet'))).toEqual([
      '0 pets',
      '1 pet',
      '2 pets',
    ]);
  });
});
