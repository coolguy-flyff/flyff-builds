import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { computeAllResults } from '@/domain/engine';

import { requireDefined } from '@/lib/assert';

import { cellDetails } from './cellDetails';
import { buildRows, groupLabel, groupRows, RESULTS_GROUPS } from './rowCatalog';
import { makePage, withPage } from './testing/fixtures';

const data = loadBundledGameData();
const NO_RAW = { showRawTotals: false };

function labelsOf(...pages: ReturnType<typeof makePage>[]): string[] {
  return buildRows(data, pages.map(withPage), NO_RAW).map((row) => row.label);
}

describe('buildRows', () => {
  it('lists the static groups in catalogue order with the A4.2 rows', () => {
    const rows = buildRows(data, [withPage(makePage({ healingSkills: null }))], NO_RAW);
    const groups = groupRows(rows);

    expect(groups.map((bucket) => bucket.group.id)).toEqual([
      'base',
      'vitals',
      'speed',
      'offense',
      'defense',
    ]);
    // The bare page has every plain % total at 0 and jump height at 100, so those rows are left
    // out; defense ends with one "Block %" row while melee and ranged block agree everywhere.
    expect(groups.map((bucket) => bucket.rows.length)).toEqual([4, 3, 2, 2, 4]);
    expect(rows.map((row) => row.label).slice(0, 7)).toEqual([
      'STR',
      'STA',
      'DEX',
      'INT',
      'Max HP',
      'Max MP',
      'Max FP',
    ]);
  });

  it('selects scalar and range values from the page', () => {
    const page = makePage({ attack: 2424, defenseMin: 1722, defenseMax: 1727 });
    const rows = buildRows(data, [withPage(page)], NO_RAW);
    const byId = new Map(rows.map((row) => [row.id, row]));

    expect(byId.get('attack')?.select(page)).toBe(2424);
    expect(byId.get('attack')?.format).toBe('int');
    expect(byId.get('defense')?.select(page)).toEqual({ min: 1722, max: 1727 });
    expect(byId.get('defense')?.format).toBe('range');
    expect(byId.get('criticalChance')?.format).toBe('percent');
  });

  it('marks incoming damage as lower-is-better and everything else as higher-is-better', () => {
    const rows = buildRows(data, [withPage(makePage({ incomingDamage: 5 }))], NO_RAW);
    const lowerIsBetter = rows.filter((row) => !row.higherIsBetter).map((row) => row.id);

    expect(lowerIsBetter).toEqual(['incomingDamage']);
  });

  it('leaves out rows that sit at their idle value in every column (feedback 2026-09-04)', () => {
    const idle = makePage();

    expect(labelsOf(idle, idle)).not.toContain('Skill damage %');
    expect(labelsOf(idle, idle)).not.toContain('Incoming damage %');
    expect(labelsOf(idle, idle)).not.toContain('Jump height %');
    expect(labelsOf(idle, idle)).not.toContain('Action speed %');
    // One column with a value brings the row back for every column.
    expect(labelsOf(idle, makePage({ skillDamage: 10, jumpHeight: 150, actionSpeed: 15 }))).toEqual(
      expect.arrayContaining(['Skill damage %', 'Jump height %', 'Action speed %']),
    );
    // Rows with a DEX term are never idle.
    expect(labelsOf(idle)).toEqual(expect.arrayContaining(['Critical chance %', 'Parry']));
  });

  it('shows neither attack speed nor hit rate', () => {
    expect(labelsOf(makePage({ attackSpeed: 80, hitRate: 96 }))).not.toContain('Attack speed %');
    expect(labelsOf(makePage({ attackSpeed: 80, hitRate: 96 }))).not.toContain('Hit rate %');
  });

  it('explains critical chance as the DEX term plus its sources', () => {
    // A fresh Seraph with max RM buffs: DEX 15 + 40 (Cannon Ball) = 55 → floor(5.5 × 1) = 5.
    const [result] = computeAllResults(data, createDefaultBuild(data));
    const swap = requireDefined(result, 'first swap');
    const row = requireDefined(
      buildRows(data, [swap], NO_RAW).find((candidate) => candidate.id === 'criticalChance'),
      'critical chance row',
    );

    expect(row.tooltip).toContain('DEX ÷ 10 × job factor');
    expect(row.select(swap.page)).toBe(5);
    expect(cellDetails(row, swap)).toEqual([{ label: 'From DEX (job factor)', value: '5%' }]);
  });

  it('adds the healing group only when a column has healing skills', () => {
    const seraph = makePage();
    const other = makePage({ healingSkills: null });

    expect(
      groupRows(buildRows(data, [withPage(other)], NO_RAW)).map((g) => g.group.id),
    ).not.toContain('healing');

    const rows = buildRows(data, [withPage(other), withPage(seraph)], NO_RAW);
    const healing = groupRows(rows).find((bucket) => bucket.group.id === 'healing');

    expect(healing?.group.note).toContain('Heal synergy');
    expect(healing?.rows.map((row) => row.label)).toEqual([
      'Heal Rain (Lv 10)',
      'Gloria Patri (Lv 5)',
      'Gloria Patri – Effect Increase (Lv 5)',
    ]);
    expect(healing?.rows[0]?.tooltip).toBeUndefined();
    expect(healing?.rows[1]?.tooltip).toContain('Heal');
    expect(healing?.rows[1]?.select(seraph)).toBe(6408);
    expect(healing?.rows[1]?.select(other)).toBeNull();
  });

  it('adds one raw-total row per parameter and bucket with a non-zero value in any column', () => {
    const first = makePage({
      rawTotals: { maxhp: { flat: 0, rate: 35 }, str: { flat: 10, rate: 0 } },
    });
    const second = makePage({ rawTotals: { decreasedmpconsumption: { flat: 0, rate: 10 } } });
    const rows = buildRows(data, [withPage(first), withPage(second)], { showRawTotals: true });
    const raw = rows.filter((row) => row.group === 'raw');

    expect(raw.map((row) => row.label)).toEqual(['HP %', 'MP Consumption Decrease %', 'STR']);
    expect(raw.map((row) => row.id)).toEqual([
      'raw:maxhp:rate',
      'raw:decreasedmpconsumption:rate',
      'raw:str:flat',
    ]);
    expect(raw[0]?.format).toBe('percent');
    expect(raw[2]?.format).toBe('int');
    expect(raw[2]?.select(first)).toBe(10);
    expect(raw[2]?.select(second)).toBe(0);
    expect(buildRows(data, [withPage(first)], NO_RAW).some((row) => row.group === 'raw')).toBe(
      false,
    );
  });

  it('works on real engine output for the default Seraph build', () => {
    const results = computeAllResults(data, createDefaultBuild(data));
    const rows = buildRows(data, results, { showRawTotals: true });
    const groups = groupRows(rows);
    const page = results[0]?.page;

    expect(page).toBeDefined();
    expect(groups.map((bucket) => bucket.group.id)).toEqual([...RESULTS_GROUPS.map((g) => g.id)]);

    for (const row of rows.filter((candidate) => candidate.group === 'raw')) {
      expect(row.select(page ?? makePage())).not.toBe(0);
    }
  });
});

describe('groupLabel', () => {
  it('resolves the display label of a group id', () => {
    expect(groupLabel('base')).toBe('Base stats');
    expect(groupLabel('raw')).toBe('Raw totals');
  });
});
