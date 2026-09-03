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
        healRain: { skillOutput: 2254, healingRate: 0, total: 2254 },
        gloriaPatri: { skillOutput: 6408, healingRate: 80, total: 11534 },
        gloriaPatriEffectIncrease: { skillOutput: 6740, healingRate: 80, total: 12132 },
      },
    });
    const rows = buildRows(data, [withPage(page)], { showRawTotals: false });
    const gloriaPatri = requireDefined(
      rows.find((row) => row.id === 'gloriaPatri'),
      'Gloria Patri row',
    );

    expect(gloriaPatri.select(page)).toBe(11534);
    expect(requireDefined(gloriaPatri.details, 'details')(page)).toEqual([
      { label: 'Skill output', value: '6,408' },
      { label: 'Healing % multiplier', value: '×1.80' },
      { label: 'Gain from multiplier', value: '+5,126' },
    ]);
    expect(
      requireDefined(gloriaPatri.details, 'details')(makePage({ healingSkills: null })),
    ).toEqual([]);
  });
});
