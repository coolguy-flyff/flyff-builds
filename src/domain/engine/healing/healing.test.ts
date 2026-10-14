import { describe, expect, it } from 'vitest';

import {
  CLASS_IDS,
  GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID,
  GLORIA_PATRI_SKILL_ID,
  HEAL_RAIN_SKILL_ID,
  HEAL_SKILL_ID,
  loadBundledGameData,
  requireClass,
  type StatKey,
} from '@/data';
import { requireDefined } from '@/lib/assert';

import { DEFAULT_WEAPON } from '../defaultWeapon';
import { DEFAULT_ENGINE_OPTIONS } from '../options';
import type { StatContext } from '../stats/context';
import { computeHealingSkills, type HealingBreakdown, type HealingSkills } from './healing';

const data = loadBundledGameData();

function healerContext(
  stats: Partial<Record<StatKey, number>>,
  healingRate: number,
  jobId: number = CLASS_IDS.seraph,
  level = 190,
): StatContext {
  return {
    data,
    level,
    job: requireClass(data, jobId),
    base: (stat) => stats[stat] ?? 15,
    total: (parameter, rate) => (parameter === 'healing' && rate ? healingRate : 0),
    mainhand: { item: DEFAULT_WEAPON, upgrade: 0 },
    offhand: null,
    armorPieces: [],
    hasUpcutStone: false,
  };
}

function heal(healed: HealingSkills, skillId: number): HealingBreakdown {
  return requireDefined(healed[skillId], `No healing row for skill ${skillId}`);
}

describe('Seraph healing rows (plan B7.3)', () => {
  const stats = { sta: 400, int: 200 };

  it('pins STA 400 / INT 200 without healing bonus at the listed max-level scaling', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 0), DEFAULT_ENGINE_OPTIONS);

    // Heal 650 + floor(5.88 × 200); Heal Rain 650 + floor(8.18 × 200);
    // Gloria Patri 600 + floor(12.08 × 400) + 1000 synergy.
    expect(heal(healed, HEAL_SKILL_ID).total).toBe(1826);
    expect(heal(healed, HEAL_RAIN_SKILL_ID).total).toBe(2286);
    expect(heal(healed, GLORIA_PATRI_SKILL_ID).total).toBe(6432);
    expect(heal(healed, GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID).total).toBe(6732);
  });

  it('gives the Effect Increase variation the same scaling as Gloria Patri', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 0), DEFAULT_ENGINE_OPTIONS);
    const effectIncrease = heal(healed, GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID);

    // Only the flat HP differs (900 vs 600); the old level-shifted formula scaled them apart.
    expect(effectIncrease.skillOutput - heal(healed, GLORIA_PATRI_SKILL_ID).skillOutput).toBe(300);
  });

  it('floors the scaled term exactly at a scale × stat that lands on an integer', () => {
    const healed = computeHealingSkills(
      data,
      healerContext({ int: 100 }, 0),
      DEFAULT_ENGINE_OPTIONS,
    );

    // 8.18 × 100 = 818 in decimal; floating-point drift must not floor it to 817.
    expect(heal(healed, HEAL_RAIN_SKILL_ID).skillOutput).toBe(650 + 818);
  });

  it('scales by the healing rate after the synergy and reports the split', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 20), DEFAULT_ENGINE_OPTIONS);

    expect(heal(healed, GLORIA_PATRI_SKILL_ID)).toEqual({
      skillOutput: 6432,
      healingRate: 20,
      total: 7718,
    });
    expect(heal(healed, GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID).total).toBe(8078);
    expect(heal(healed, HEAL_RAIN_SKILL_ID)).toEqual({
      skillOutput: 2286,
      healingRate: 20,
      total: 2743,
    });
  });

  it('leaves the Heal synergy out when switched off', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 0), {
      ...DEFAULT_ENGINE_OPTIONS,
      applyHealSynergy: false,
    });

    expect(heal(healed, GLORIA_PATRI_SKILL_ID).total).toBe(5432);
    expect(heal(healed, GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID).total).toBe(5732);
    expect(heal(healed, HEAL_RAIN_SKILL_ID).total).toBe(2286);
  });
});

describe('healing rows by job and level', () => {
  const rowsOf = (jobId: number, level: number): number[] =>
    Object.keys(
      computeHealingSkills(data, healerContext({}, 0, jobId, level), DEFAULT_ENGINE_OPTIONS),
    ).map(Number);

  it('gives an Assist Heal only', () => {
    expect(rowsOf(CLASS_IDS.assist, 15)).toEqual([HEAL_SKILL_ID]);
  });

  it('adds Heal Rain to a Ringmaster from its Lv 70', () => {
    expect(rowsOf(CLASS_IDS.ringmaster, 69)).toEqual([HEAL_SKILL_ID]);
    expect(rowsOf(CLASS_IDS.ringmaster, 70)).toEqual([HEAL_SKILL_ID, HEAL_RAIN_SKILL_ID]);
  });

  it('adds Gloria Patri to a Seraph from its Lv 170', () => {
    expect(rowsOf(CLASS_IDS.seraph, 169)).toHaveLength(2);
    expect(rowsOf(CLASS_IDS.seraph, 170)).toHaveLength(4);
  });

  it('gives jobs outside the Assist chain no healing rows', () => {
    expect(rowsOf(CLASS_IDS.mercenary, 50)).toEqual([]);
    expect(rowsOf(CLASS_IDS.templar, 190)).toEqual([]);
  });
});
