import { describe, expect, it } from 'vitest';

import { CLASS_IDS, loadBundledGameData, requireClass, requireItem, type StatKey } from '@/data';

import { DEFAULT_WEAPON } from '../defaultWeapon';
import { resolveGearSwap } from '../resolve';
import { addEquipmentSet, addWeapon, createTestBuild, firstSwap } from '../testing/builders';
import type { EquippedItem } from '../types';
import { computeAttack, computeHitMinMax, computeWeaponAttack } from './attack';
import type { StatContext } from './context';
import { computeEquipmentDefenseRange } from './defense';
import { computeResultsPage } from './resultsPage';

const data = loadBundledGameData();
const ORACLE_ULTIMATE = 54987;
const ETRANAR_SET = 41091;

interface SyntheticContext {
  readonly stats?: Partial<Record<StatKey, number>>;
  readonly totals?: Readonly<Record<string, number>>;
  readonly mainhand?: EquippedItem;
  readonly armorPieces?: readonly EquippedItem[];
  readonly hasUpcutStone?: boolean;
}

/** A context with explicit inputs so each formula can be pinned in isolation. */
function syntheticContext(spec: SyntheticContext): StatContext {
  return {
    data,
    level: 190,
    job: requireClass(data, CLASS_IDS.seraph),
    base: (stat) => spec.stats?.[stat] ?? 15,
    total: (parameter, rate) => spec.totals?.[`${parameter}:${rate ? '%' : 'flat'}`] ?? 0,
    mainhand: spec.mainhand ?? { item: DEFAULT_WEAPON, upgrade: 0 },
    armorPieces: spec.armorPieces ?? [],
    hasUpcutStone: spec.hasUpcutStone ?? false,
  };
}

describe('bare Seraph 190 (STR 15 / STA 400 / DEX 15 / INT 15, no gear, no buffs)', () => {
  const build = createTestBuild(data, { stats: { sta: 400 } });
  const page = computeResultsPage(data, resolveGearSwap(data, build, firstSwap(build)));

  it('matches the hand-computed pins from plan C2', () => {
    expect(page).toMatchObject({
      str: 15,
      sta: 400,
      dex: 15,
      int: 15,
      hp: 32450,
      mp: 949,
      fp: 1272,
      attack: 217,
      attackSpeed: 42,
      defenseMin: 561,
      defenseMax: 561,
      magicDefense: 845,
      parry: 7,
      hitRate: 20,
      meleeBlock: 6.25,
      rangedBlock: 6.25,
      criticalChance: 1,
      movementSpeed: 100,
      castingSpeed: 100,
      jumpHeight: 100,
    });
  });

  it('reports zero for every plain percentage row and empty raw totals', () => {
    expect(page.magicAttack).toBe(0);
    expect(page.healing).toBe(0);
    expect(page.pveDamageReduction).toBe(0);
    expect(page.rawTotals).toEqual({});
  });

  it('computes Seraph healing rows and leaves them out for other jobs', () => {
    expect(page.healingSkills).not.toBeNull();

    const templar = createTestBuild(data, { jobId: CLASS_IDS.templar });

    expect(
      computeResultsPage(data, resolveGearSwap(data, templar, firstSwap(templar))).healingSkills,
    ).toBeNull();
  });
});

describe('weapon attack and hit range', () => {
  const oracle = requireItem(data, ORACLE_ULTIMATE);
  const ctx = syntheticContext({ mainhand: { item: oracle, upgrade: 10 } });

  it('pins Oracle +10 at STR 15: weapon attack 267, hit 2421–2427, attack 2424', () => {
    expect(computeWeaponAttack(ctx, 'stick')).toBe(267);
    expect(computeHitMinMax(ctx)).toEqual({ min: 2421, max: 2427 });
    expect(computeAttack(ctx)).toBe(2424);
  });

  it('applies Upcut Stone, positive attack rates and flat attack in Flyffulator order', () => {
    const boosted = syntheticContext({
      mainhand: { item: oracle, upgrade: 10 },
      hasUpcutStone: true,
      totals: { 'attack:%': 10, 'attack:flat': 100 },
    });
    const negative = syntheticContext({
      mainhand: { item: oracle, upgrade: 10 },
      totals: { 'attack:%': -10 },
    });

    // floor(2424 * 1.2) = 2908; + 10 % = 3198.8; + 100 → floor = 3298
    expect(computeAttack(boosted)).toBe(3298);
    expect(computeAttack(negative)).toBe(2424);
  });

  it('uses bare hands with a job-independent factor', () => {
    expect(computeWeaponAttack(syntheticContext({}), 'hand')).toBe(214);
  });

  it('flows the chosen stat range into the page attack', () => {
    const build = createTestBuild(data);

    addWeapon(build, { itemId: ORACLE_ULTIMATE, upgrade: 10 });

    const page = computeResultsPage(data, resolveGearSwap(data, build, firstSwap(build)));

    // Oracle's attack range defaults to floor(17 + 2.5) = 19 %: floor(2424 * 1.19) = 2884.
    expect(page.attack).toBe(2884);
    expect(page.int).toBe(49);
  });
});

describe('defense', () => {
  it('pins Etranar +10 equipment defense 6889–6908', () => {
    const set = data.armorSets.get(ETRANAR_SET);
    const pieces = Object.values(set?.parts ?? {}).map((id) => ({
      item: requireItem(data, id),
      upgrade: 10,
    }));

    expect(pieces.length).toBe(4);
    expect(computeEquipmentDefenseRange(syntheticContext({ armorPieces: pieces }))).toEqual({
      min: 6889,
      max: 6908,
    });
  });

  it('shows the deterministic min~max on the page', () => {
    const build = createTestBuild(data, { stats: { sta: 400 } });

    addEquipmentSet(build, { setId: ETRANAR_SET, upgrade: 10 });

    const page = computeResultsPage(data, resolveGearSwap(data, build, firstSwap(build)));

    // STA 400 + allstats 18 (set bonus 10 + upgrade bonus 8) → base 581; + floor(6889/4) / floor(6908/4).
    expect(page.sta).toBe(418);
    expect(page.defenseMin).toBe(2303);
    expect(page.defenseMax).toBe(2308);
  });
});
