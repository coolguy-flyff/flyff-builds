import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { requireDefined } from '@/lib/assert';

import { buildRows } from './rowCatalog';
import { makePage, withPage } from './testing/fixtures';

const data = loadBundledGameData();

describe('healing row details (feedback 2026-09-03, item 4)', () => {
  it('explains a heal as skill output, multiplier and the gain from it', () => {
    const page = makePage({
      healingSkills: {
        healRain: { skillOutput: 2286, healingRate: 0, total: 2286 },
        gloriaPatri: { skillOutput: 6432, healingRate: 80, total: 11577 },
        gloriaPatriEffectIncrease: { skillOutput: 6732, healingRate: 80, total: 12117 },
      },
    });
    const rows = buildRows(data, [withPage(page)], { showRawTotals: false });
    const gloriaPatri = requireDefined(
      rows.find((row) => row.id === 'gloriaPatri'),
      'Gloria Patri row',
    );

    expect(gloriaPatri.select(page)).toBe(11577);
    expect(requireDefined(gloriaPatri.details, 'details')(page)).toEqual([
      { label: 'Skill output', value: '6,432' },
      { label: 'Healing % multiplier', value: '×1.80' },
      { label: 'Gained from multiplier', value: '+5,145' },
    ]);
    expect(
      requireDefined(gloriaPatri.details, 'details')(makePage({ healingSkills: null })),
    ).toEqual([]);
  });
});
