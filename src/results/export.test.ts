import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { computeAllResults } from '@/domain/engine';

import {
  buildExportTable,
  csvField,
  renderExport,
  toCsv,
  toMarkdown,
  toTsv,
  type ExportColumn,
} from './export';
import { buildRows } from './rowCatalog';
import { makePage } from './testing/fixtures';

const data = loadBundledGameData();

function fixture() {
  const columns: ExportColumn[] = [
    { name: 'Bare', composition: ['Page 1'], page: makePage() },
    {
      name: 'Oracle, +10',
      composition: ['Oracle +10 · STA +4', 'Page 1'],
      page: makePage({ attack: 2424, defenseMin: 1722, defenseMax: 1727 }),
    },
  ];
  const rows = buildRows(data, columns, { showRawTotals: false }).filter(
    (row) => row.id === 'attack' || row.id === 'defense' || row.id === 'hp',
  );

  return { rows, columns, table: buildExportTable(rows, columns) };
}

describe('buildExportTable', () => {
  it('lays out group, stat and one formatted cell per column', () => {
    const { table } = fixture();

    expect(table.header).toEqual(['Group', 'Stat', 'Bare', 'Oracle, +10']);
    expect(table.body).toEqual([
      ['Vitals', 'Max HP', '32,450', '32,450'],
      ['Offense', 'Attack', '217', '2,424'],
      ['Defense', 'Defense', '561~561', '1,722~1,727'],
    ]);
    expect(table.composition).toEqual([
      { name: 'Bare', parts: ['Page 1'] },
      { name: 'Oracle, +10', parts: ['Oracle +10 · STA +4', 'Page 1'] },
    ]);
  });
});

describe('toTsv', () => {
  it('tab-separates the table and appends the composition block', () => {
    const lines = toTsv(fixture().table).split('\n');

    expect(lines[0]).toBe('Group\tStat\tBare\tOracle, +10');
    expect(lines[2]).toBe('Offense\tAttack\t217\t2,424');
    expect(lines.slice(4)).toEqual([
      '',
      'Composition',
      'Bare\tPage 1',
      'Oracle, +10\tOracle +10 · STA +4 · Page 1',
    ]);
  });
});

describe('toMarkdown', () => {
  it('renders a pipe table with a separator row and a composition list', () => {
    const text = toMarkdown(fixture().table);

    expect(text).toContain('| Group | Stat | Bare | Oracle, +10 |\n| --- | --- | --- | --- |');
    expect(text).toContain('| Offense | Attack | 217 | 2,424 |');
    expect(text).toContain('**Composition**');
    expect(text).toContain('- **Oracle, +10** → Oracle +10 · STA +4 · Page 1');
  });

  it('escapes pipes inside cells', () => {
    const column: ExportColumn = { name: 'A | B', composition: [], page: makePage() };
    const rows = buildRows(data, [column], { showRawTotals: false }).slice(0, 1);

    expect(toMarkdown(buildExportTable(rows, [column]))).toContain('| Group | Stat | A \\| B |');
    expect(toMarkdown(buildExportTable(rows, [column]))).toContain('- **A \\| B** → —');
  });
});

describe('toCsv', () => {
  it('quotes fields containing commas or quotes and uses CRLF line ends', () => {
    const lines = toCsv(fixture().table).split('\r\n');

    expect(lines[0]).toBe('Group,Stat,Bare,"Oracle, +10"');
    expect(lines[2]).toBe('Offense,Attack,217,"2,424"');
    expect(lines.slice(4)).toEqual([
      '',
      'Composition',
      'Bare,Page 1',
      '"Oracle, +10",Oracle +10 · STA +4 · Page 1',
    ]);
  });

  it('doubles embedded quotes', () => {
    expect(csvField('Swap "x", y')).toBe('"Swap ""x"", y"');
    expect(csvField('plain')).toBe('plain');
    expect(csvField('multi\nline')).toBe('"multi\nline"');
  });
});

describe('renderExport', () => {
  it('dispatches on the format', () => {
    const { table } = fixture();

    expect(renderExport('tsv', table)).toBe(toTsv(table));
    expect(renderExport('markdown', table)).toBe(toMarkdown(table));
    expect(renderExport('csv', table)).toBe(toCsv(table));
  });

  it('exports real engine output end to end', () => {
    const results = computeAllResults(data, createDefaultBuild(data));
    const rows = buildRows(data, results, { showRawTotals: true });
    const columns = results.map((result) => ({
      name: `Swap ${result.swapId}`,
      composition: ['Page 1'],
      page: result.page,
    }));
    const csv = renderExport('csv', buildExportTable(rows, columns));

    expect(csv).toContain('Vitals,Max HP,');
    expect(csv).toContain('Healing skills,Heal Rain (Lv 10),');
    expect(csv).toContain('Raw totals,');
    expect(csv.endsWith('Swap 2,Page 1')).toBe(true);
  });
});
