import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { maximalBuild } from '@/share/testing/fixtures';

import { describeBuildCounts } from './buildSummary';

const data = loadBundledGameData();

describe('describeBuildCounts', () => {
  it('always shows stat pages and swaps and omits empty lists', () => {
    expect(describeBuildCounts(createDefaultBuild(data))).toBe('1 stat page · 1 swap');
  });

  it('lists every populated list in plan order with plural nouns', () => {
    expect(describeBuildCounts(maximalBuild(data))).toBe(
      '2 stat pages · 2 sets · 4 weapons · 2 shields · 3 accessory sets · 2 fashion sets · 3 pets · 4 swaps',
    );
  });
});
