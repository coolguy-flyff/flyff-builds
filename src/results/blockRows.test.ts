import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { computeAllResults } from '@/domain/engine';
import { requireDefined } from '@/lib/assert';

import { cellDetails } from './cellDetails';
import { buildRows } from './rowCatalog';
import { makePage, withPage } from './testing/fixtures';

const data = loadBundledGameData();
const NO_RAW = { showRawTotals: false };

describe('block rows (feedback 2026-09-03: uncapped block before the attacker)', () => {
  it('shows one "Block %" row while melee and ranged agree in every column', () => {
    const rows = buildRows(data, [withPage(makePage()), withPage(makePage())], NO_RAW);
    const labels = rows.filter((row) => row.group === 'defense').map((row) => row.label);

    expect(labels).toContain('Block %');
    expect(labels).not.toContain('Melee block %');
    expect(
      requireDefined(
        rows.find((row) => row.id === 'block'),
        'block row',
      ).select(makePage()),
    ).toBe(1);
  });

  it('splits into melee and ranged rows as soon as one column differs', () => {
    // 150% melee block from two Speedo +5 and more, ranged untouched.
    const stacked = makePage({
      meleeBlock: 151,
      meleeBlockBreakdown: { fromDex: 1.125, fromGear: 150, total: 151 },
    });
    const rows = buildRows(data, [withPage(makePage()), withPage(stacked)], NO_RAW);
    const labels = rows.filter((row) => row.group === 'defense').map((row) => row.label);

    expect(labels).toContain('Melee block %');
    expect(labels).toContain('Ranged block %');
    expect(labels).not.toContain('Block %');
    // Uncapped: the game's 92.5% ceiling applies to the effective chance, not to this value.
    expect(
      requireDefined(
        rows.find((row) => row.id === 'meleeBlock'),
        'melee row',
      ).select(stacked),
    ).toBe(151);
  });

  it('explains the stat name as pure block, and the cell as the DEX term plus its sources', () => {
    // A fresh Seraph with max RM buffs: DEX 15 + 40 (Cannon Ball) = 55, 55 / 8 × 0.6 = 4.125 from
    // DEX (shown rounded down), Cat's Reflex +20% — floor(24.125) = 24.
    const [result] = computeAllResults(data, createDefaultBuild(data));
    const swap = requireDefined(result, 'first swap');
    const rows = buildRows(data, [swap], NO_RAW);
    const block = requireDefined(
      rows.find((row) => row.id === 'block'),
      'block row',
    );

    expect(block.tooltip).toContain('not the effective');
    expect(block.tooltip).toContain('block penetration');
    expect(block.tooltip).toContain('6.25–92.5%');
    expect(block.select(swap.page)).toBe(24);
    expect(cellDetails(block, swap)).toEqual([
      { label: 'From DEX (job factor)', value: '4%' },
      { label: "Cat's Reflex", value: '+20%' },
    ]);
  });
});
