import { describe, expect, it } from 'vitest';

import { CLASS_IDS, loadBundledGameData, requireItem, type SlimItem } from '@/data';

import {
  blessingSlotsUsed,
  defaultRandomStatValue,
  halfStat,
  isReachableBlessingTotal,
  isValidSetStatAwake,
  isValidStatAwake,
  minBlessingSlots,
  offhandKind,
  petTierBreakdown,
  piercingSlots,
  randomStatBounds,
  randomStatLineCount,
  reachableBlessingTotals,
  reachablePetTotals,
  remainingStatPoints,
  setAwakePartnerOptions,
  setAwakeSecondTotals,
  skillAwakeOptions,
  statAwakeCombos,
  statAwakePartnerOptions,
  statAwakeValueOptions,
  totalStatPoints,
  ultimateJewelSlots,
  upgradeFlatBonus,
  upgradeMultiplier,
} from './index';

const data = loadBundledGameData();
const ORACLE_ULTIMATE = 54987; // 2H stick, ultimate
const MAW_OF_JUDGEMENT_ULTIMATE = 11979; // 1H knuckle, ultimate
const ETRANAR_HELMET = 41822;
const LION_PET = 9941;

function findItem(predicate: (item: SlimItem) => boolean): SlimItem {
  const item = [...data.items.values()].find(predicate);

  if (item === undefined) {
    throw new Error('fixture item not found');
  }

  return item;
}

describe('slots', () => {
  it('piercing slots by item type', () => {
    expect(piercingSlots(requireItem(data, ORACLE_ULTIMATE))).toBe(10);
    expect(piercingSlots(requireItem(data, MAW_OF_JUDGEMENT_ULTIMATE))).toBe(5);
    expect(piercingSlots(requireItem(data, 22954))).toBe(4); // Etranar suit
    expect(piercingSlots(requireItem(data, 56920))).toBe(5); // Hell's Gate shield
    expect(piercingSlots(requireItem(data, ETRANAR_HELMET))).toBe(0);
  });

  it('jewel slots follow the upgrade, with the one-handed sword/axe exception', () => {
    const oneHandedSword = findItem(
      (item) =>
        item.rarity === 'ultimate' &&
        item.subcategory === 'sword' &&
        item.twoHanded !== true &&
        item.class !== CLASS_IDS.templar,
    );

    expect(ultimateJewelSlots(requireItem(data, ORACLE_ULTIMATE), 8)).toBe(8);
    expect(ultimateJewelSlots(requireItem(data, ETRANAR_HELMET), 10)).toBe(0);
    expect([5, 7, 8, 10].map((u) => ultimateJewelSlots(oneHandedSword, u))).toEqual([5, 5, 6, 7]);
  });
});

describe('upgrade', () => {
  it('multipliers and flat bonuses match the upgrade table', () => {
    const oracle = requireItem(data, ORACLE_ULTIMATE);
    const helmet = requireItem(data, ETRANAR_HELMET);
    const unique = findItem((item) => item.category === 'weapon' && item.rarity === 'unique');

    expect(upgradeMultiplier(data, unique, 10)).toBeCloseTo(1.24);
    expect(upgradeMultiplier(data, oracle, 10)).toBeCloseTo(1.5);
    expect(upgradeMultiplier(data, oracle, 0)).toBeCloseTo(1.24);
    expect(upgradeMultiplier(data, helmet, 10)).toBeCloseTo(1.2);
    expect(upgradeMultiplier(data, helmet, 0)).toBe(1);
    expect([1, 6, 10, 16, 20].map(upgradeFlatBonus)).toEqual([1, 14, 31, 64, 89]);
    expect(upgradeFlatBonus(0)).toBe(0);
  });
});

describe('stat awakes', () => {
  it('exposes 48 combinations and validates pairs in either orientation', () => {
    expect(statAwakeCombos(data).length).toBe(48);
    expect(isValidStatAwake(data, [{ stat: 'sta', value: 4 }, null])).toBe(true);
    expect(isValidStatAwake(data, [{ stat: 'sta', value: 5 }, null])).toBe(false);
    expect(
      isValidStatAwake(data, [
        { stat: 'sta', value: 2 },
        { stat: 'str', value: 3 },
      ]),
    ).toBe(true);
    expect(
      isValidStatAwake(data, [
        { stat: 'str', value: 3 },
        { stat: 'dex', value: 3 },
      ]),
    ).toBe(false);
    expect(
      isValidStatAwake(data, [
        { stat: 'int', value: 1 },
        { stat: 'dex', value: 1 },
      ]),
    ).toBe(false);
  });

  it('offers partners and values as Flyffulator does', () => {
    expect([...statAwakePartnerOptions(data, 'sta')].sort()).toEqual(['dex', 'int', 'str']);
    expect(statAwakePartnerOptions(data, 'dex')).toEqual(['str', 'sta']);
    expect(statAwakeValueOptions(data, 'str', null)).toEqual([1, 2, 3, 4]);
    expect(statAwakeValueOptions(data, 'str', { stat: 'sta', value: 3 })).toEqual([1, 2]);
    expect(statAwakeValueOptions(data, 'str', { stat: 'sta', value: 2 })).toEqual([1, 2, 3]);
  });
});

describe('equipment-set awake totals', () => {
  it('reaches every second total the four pieces can distribute', () => {
    // STA 16 needs +4 singles everywhere: no partner at all.
    expect(setAwakeSecondTotals(data, 'sta', 16, 'int')).toEqual([0]);
    // STA 12 = 3 per piece; each can pair INT 1–2 → 0..8.
    expect(setAwakeSecondTotals(data, 'sta', 12, 'int')).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    // STR/DEX have no valid pair with INT: only singles on separate pieces.
    expect(Math.max(...setAwakeSecondTotals(data, 'str', 8, 'int'))).toBe(8);
    expect(Math.max(...setAwakeSecondTotals(data, 'str', 13, 'int'))).toBe(0);
  });

  it('validates set awakes against the reachable totals', () => {
    expect(isValidSetStatAwake(data, [null, null])).toBe(true);
    expect(isValidSetStatAwake(data, [{ stat: 'sta', value: 16 }, null])).toBe(true);
    expect(
      isValidSetStatAwake(data, [
        { stat: 'sta', value: 12 },
        { stat: 'int', value: 8 },
      ]),
    ).toBe(true);
    expect(
      isValidSetStatAwake(data, [
        { stat: 'sta', value: 16 },
        { stat: 'int', value: 1 },
      ]),
    ).toBe(false);
    expect(isValidSetStatAwake(data, [null, { stat: 'int', value: 4 }])).toBe(false);
    expect(isValidSetStatAwake(data, [{ stat: 'sta', value: 17 }, null])).toBe(false);
  });

  it('offers partner stats only while they can reach a non-zero total', () => {
    expect(setAwakePartnerOptions(data, 'sta', 16)).toEqual([]);
    expect([...setAwakePartnerOptions(data, 'sta', 12)].sort()).toEqual(['dex', 'int', 'str']);
  });
});

describe('skill awakes', () => {
  it('lists healing for sticks by rarity and the shield parameters', () => {
    const oracle = skillAwakeOptions(data, requireItem(data, ORACLE_ULTIMATE));
    const healing = oracle.find((option) => option.parameter === 'healing');
    const shield = skillAwakeOptions(data, requireItem(data, 56920));

    expect(oracle[0]?.parameter).toBe('healing');
    expect(healing?.values).toContain(5);
    expect(healing?.values.at(-1)).toBe(25);
    expect(shield.map((option) => option.parameter)).toContain('block');
    expect(shield.find((option) => option.parameter === 'block')?.values.at(-1)).toBe(15);
  });

  it('offers skill-damage awakes under skill:<id> parameters', () => {
    const oracle = skillAwakeOptions(data, requireItem(data, ORACLE_ULTIMATE));
    const knuckle = skillAwakeOptions(data, requireItem(data, MAW_OF_JUDGEMENT_ULTIMATE));
    const skillOptions = oracle.filter((option) => option.parameter.startsWith('skill:'));

    expect(skillOptions.length).toBeGreaterThan(0);

    for (const option of skillOptions) {
      const id = Number(option.parameter.slice('skill:'.length));

      expect(data.awakeSkills.get(id), option.parameter).toBeDefined();
      expect(option.values.length).toBeGreaterThan(0);
    }

    // Knuckles have no stat-type awake — only skill-damage awakes.
    expect(knuckle.length).toBeGreaterThan(0);
    expect(knuckle.every((option) => option.parameter.startsWith('skill:'))).toBe(true);
  });
});

describe('random stats', () => {
  it('halves on the stat step and unlocks lines at +6/+10', () => {
    expect(halfStat('sta', 7)).toBe(3);
    expect(halfStat('attack', 3.5)).toBeCloseTo(1.7, 9);
    expect(halfStat('attack', 9)).toBeCloseTo(4.5, 9);
    expect(halfStat('stealhp', 1.8)).toBeCloseTo(0.9, 9);
    expect(halfStat('attackspeed', 12.5)).toBeCloseTo(6.25, 9);
    expect([0, 5, 6, 9, 10].map(randomStatLineCount)).toEqual([2, 2, 3, 3, 4]);
  });

  it('defaults to the floored midpoint, halved for lines 3–4', () => {
    const attack = { parameter: 'attack', add: 3.5, addMax: 9, rate: true };
    const stealhp = { parameter: 'stealhp', add: 0.8, addMax: 1.8, rate: true };

    expect(defaultRandomStatValue(attack, 0)).toBe(6);
    expect(defaultRandomStatValue(stealhp, 0)).toBe(1);
    expect(defaultRandomStatValue(attack, 2)).toBeCloseTo(3, 9);
    const halved = randomStatBounds(attack, 3);

    expect(halved.min).toBeCloseTo(1.7, 9);
    expect(halved.max).toBeCloseTo(4.5, 9);
    expect(halved.step).toBe(0.1);
  });
});

describe('pets', () => {
  it('enumerates reachable totals and a representative breakdown', () => {
    const lion = data.pets.find((pet) => pet.petItemId === LION_PET);

    if (lion === undefined) {
      throw new Error('Lion pet missing');
    }

    const totals = reachablePetTotals(lion);

    expect(totals[0]).toBe(75);
    expect(totals.at(-1)).toBe(1);
    expect(totals.length).toBe(75);
    expect(petTierBreakdown(lion, 75)).toEqual([1, 2, 3, 4, 5, 7, 9]);
    expect(petTierBreakdown(lion, 1)).toEqual([1]);
    expect(petTierBreakdown(lion, 3)).toEqual([1, 2]);
    expect(petTierBreakdown(lion, 500)).toBeUndefined();
  });
});

describe('blessings', () => {
  it('computes reachable totals and minimum slots', () => {
    // 10 slots at most (4 fashion pieces + cloak, 2 slots each).
    expect(reachableBlessingTotals(data, 'sta').at(-1)).toBe(50);
    expect(isReachableBlessingTotal(data, 'sta', 51)).toBe(false);
    // Without a cloak only 8 slots: STA caps at 40.
    expect(reachableBlessingTotals(data, 'sta', 8).at(-1)).toBe(40);
    expect(minBlessingSlots(data, 'sta', 10)).toBe(2);
    expect(minBlessingSlots(data, 'criticalchance', 2.5)).toBe(1);
    expect(isReachableBlessingTotal(data, 'criticalchance', 2.4)).toBe(false);
    expect(reachableBlessingTotals(data, 'def')).toContain(20);
    expect(isReachableBlessingTotal(data, 'def', 3)).toBe(false);
    expect(
      blessingSlotsUsed(data, [
        { parameter: 'sta', total: 10 },
        { parameter: 'criticalchance', total: 2.5 },
        { parameter: 'decreasedcastingtime', total: 6 },
      ]),
    ).toBe(5);
  });
});

describe('offhand & stat points', () => {
  it('derives the offhand kind from job and mainhand', () => {
    const stick = requireItem(data, ORACLE_ULTIMATE);
    const knuckle = requireItem(data, MAW_OF_JUDGEMENT_ULTIMATE);

    expect(offhandKind(data, CLASS_IDS.seraph, stick)).toBe('none');
    expect(offhandKind(data, CLASS_IDS.seraph, knuckle)).toBe('shield');
    expect(offhandKind(data, CLASS_IDS.seraph, null)).toBe('shield');
    expect(offhandKind(data, CLASS_IDS.slayer, null)).toBe('weapon');
  });

  it('computes stat point budgets', () => {
    expect(totalStatPoints(190)).toBe(378);
    expect(remainingStatPoints(190, { id: 1, str: 15, sta: 393, dex: 15, int: 15 })).toBe(0);
    expect(remainingStatPoints(190, { id: 1, str: 15, sta: 394, dex: 15, int: 15 })).toBe(-1);
  });
});
