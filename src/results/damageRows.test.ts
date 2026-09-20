import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import {
  createDefaultBuild,
  createGearSwap,
  createWeaponEntry,
  withWeaponItem,
} from '@/domain/build';
import { computeAllResults, resolveDamageTarget, type ResultsPage } from '@/domain/engine';
import { requireDefined } from '@/lib/assert';

import { cellDetails } from './cellDetails';
import { DAMAGE_ROW_IDS, damageRows, skillRowId } from './damageRows';
import { buildRows, groupRows, type ResultsRow } from './rowCatalog';
import { BARE_DAMAGE, makePage } from './testing/fixtures';

const data = loadBundledGameData();
const ORACLE = 54987;
const HAMMER_OF_JUDGEMENT = 30021;
const FLOW_OF_SALVATION = 32253;
const FLOW_INCREASED_HEALING = 48053;
const FLOW_INCREASED_DAMAGE = 55757;
const NO_RAW = { showRawTotals: false };

function labelsOf(pages: readonly ResultsPage[], variations = {}): string[] {
  return damageRows(data, pages, variations).map((row) => row.label);
}

/** The default Seraph (max RM buffs) with an Oracle +10 on the first swap and a bare second swap. */
function oracleResults() {
  const build = createDefaultBuild(data);
  const weapon = withWeaponItem(data, createWeaponEntry(10), ORACLE);
  const swap = requireDefined(build.gearSwaps[0], 'swap');

  build.weapons.push(weapon);
  swap.weaponId = weapon.id;
  build.gearSwaps.push(createGearSwap(11, swap.statPageId));

  return computeAllResults(data, build);
}

describe('damageRows (plan §5)', () => {
  it('shows the basic attack, its crit and its overcrit for a melee page', () => {
    expect(labelsOf([makePage()])).toEqual(['Basic attack', 'Crit', 'Overcrit']);
  });

  it('swaps the overcrit for the crit chance in PvP and drops every basic row for a magician', () => {
    const basic = requireDefined(BARE_DAMAGE.basic, 'basic');
    const pvp = makePage({
      damage: {
        ...BARE_DAMAGE,
        target: resolveDamageTarget({ kind: 'preset', id: 'tank' }, 190),
        basic: { ...basic, overcrit: null, criticalChance: 0.62 },
      },
    });
    const magician = makePage({ damage: { ...BARE_DAMAGE, basic: null } });
    const critChance = requireDefined(
      damageRows(data, [pvp], {}).find((row) => row.id === DAMAGE_ROW_IDS.critChance),
      'crit chance row',
    );

    expect(labelsOf([pvp])).toEqual(['Basic attack', 'Crit', 'Effective crit chance']);
    expect(critChance.format).toBe('percent');
    expect(critChance.select(pvp)).toBe(0.62);
    expect(requireDefined(critChance.details, 'details')(pvp)).toEqual([
      { label: 'Crit chance', value: '1%' },
      { label: 'Target crit resist', value: '0%' },
    ]);
    expect(labelsOf([magician])).toEqual([]);
    // One melee column brings the rows back for every column.
    expect(labelsOf([magician, makePage()])).toEqual(['Basic attack', 'Crit', 'Overcrit']);
  });

  it('adds a left-hand row when a column has one', () => {
    const basic = requireDefined(BARE_DAMAGE.basic, 'basic');
    const dual = makePage({ damage: { ...BARE_DAMAGE, leftHand: basic } });

    expect(labelsOf([dual])).toContain('Left hand');
    expect(
      requireDefined(
        damageRows(data, [dual], {}).find((row) => row.id === DAMAGE_ROW_IDS.leftHand),
        'left hand row',
      ).select(dual),
    ).toBe(15);
  });

  it('explains a cell with the hit before defense, the multiplier and the target defense', () => {
    const page = makePage();
    const rows = damageRows(data, [page], {});
    const basic = requireDefined(
      rows.find((row) => row.id === DAMAGE_ROW_IDS.basic),
      'basic',
    );
    const crit = requireDefined(
      rows.find((row) => row.id === DAMAGE_ROW_IDS.crit),
      'crit',
    );

    expect(basic.select(page)).toBe(15);
    expect(crit.select(page)).toEqual({ min: 16, max: 21 });
    expect(crit.format).toBe('range');
    expect(requireDefined(basic.details, 'details')(page)).toEqual([
      { label: 'Hit before defense', value: '216~218' },
      { label: 'Attack multiplier', value: '×1.00' },
      { label: 'Target defense', value: '185' },
    ]);
    expect(requireDefined(crit.details, 'details')(page)).toContainEqual({
      label: 'Crit factor',
      value: '1.1–1.4',
    });
    expect(basic.tooltip).toContain('normal hit');
    expect(crit.tooltip).toContain('1.1–1.4');
  });

  it('adds one row per skill family present in a column, with a variation select', () => {
    const results = oracleResults();
    const [oracle] = results;
    const swap = requireDefined(oracle, 'oracle swap');
    const rows = buildRows(data, results, NO_RAW);
    const hammer = requireDefined(
      rows.find((row) => row.id === skillRowId(HAMMER_OF_JUDGEMENT)),
      'Hammer of Judgement row',
    );

    expect(hammer.label).toBe('Hammer of Judgement');
    // The explanation lives on the Damage group, not on every skill row.
    expect(hammer.tooltip).toBeUndefined();
    expect(hammer.select(swap.page)).toBe(
      requireDefined(swap.page.damage.skills[HAMMER_OF_JUDGEMENT], 'hammer').average,
    );
    // Every Hammer variation deals the base's damage (Sanctuary Area only adds a heal), so the
    // row offers no select; Flow of Salvation's Increased Damage raises the attack range.
    expect(hammer.variants).toBeUndefined();

    const flow = requireDefined(
      rows.find((row) => row.id === skillRowId(FLOW_OF_SALVATION)),
      'Flow of Salvation row',
    );

    expect(flow.variants).toMatchObject({
      key: String(FLOW_OF_SALVATION),
      value: String(FLOW_OF_SALVATION),
      ariaLabel: 'Flow of Salvation variation',
    });
    expect(flow.variants?.options.map((option) => option.label)).toEqual([
      'Flow of Salvation',
      'Flow of Salvation (Increased Damage)',
    ]);
    expect(cellDetails(hammer, swap).map((line) => line.label)).toEqual([
      'Skill power',
      'Attack before defense',
      'Attack multiplier',
      'Target defense',
    ]);
    // The bare-handed second swap cannot use stick skills: its cell is empty.
    expect(hammer.select(requireDefined(results[1], 'second swap').page)).toBeNull();
    expect(groupRows(rows).map((bucket) => bucket.group.id)).toContain('damage');
  });

  it('follows the chosen variation and falls back to the base for an unknown or same-damage choice', () => {
    const results = oracleResults();
    const swap = requireDefined(results[0], 'oracle swap');
    const flowRow = (chosenId: number): ResultsRow =>
      requireDefined(
        buildRows(data, results, {
          ...NO_RAW,
          skillVariations: { [FLOW_OF_SALVATION]: chosenId },
        }).find((row) => row.id === skillRowId(FLOW_OF_SALVATION)),
        'row',
      );
    const chosen = flowRow(FLOW_INCREASED_DAMAGE);

    expect(chosen.label).toBe('Flow of Salvation (Increased Damage)');
    expect(chosen.variants?.value).toBe(String(FLOW_INCREASED_DAMAGE));
    expect(chosen.select(swap.page)).toBe(
      requireDefined(swap.page.damage.skills[FLOW_INCREASED_DAMAGE], 'variation').average,
    );
    expect(flowRow(424242).label).toBe('Flow of Salvation');
    // Increased Healing is not offered (same damage as the base), so a stale choice shows the base.
    expect(flowRow(FLOW_INCREASED_HEALING).label).toBe('Flow of Salvation');
  });
});
