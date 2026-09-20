import { describe, expect, it } from 'vitest';

import { CLASS_IDS, loadBundledGameData, requireClass, type StatKey } from '@/data';

import { DEFAULT_WEAPON } from '../defaultWeapon';
import { DEFAULT_ENGINE_OPTIONS } from '../options';
import type { StatContext } from '../stats/context';
import { computeHealingSkills } from './healing';

const data = loadBundledGameData();

function healerContext(stats: Partial<Record<StatKey, number>>, healingRate: number): StatContext {
  return {
    data,
    level: 190,
    job: requireClass(data, CLASS_IDS.seraph),
    base: (stat) => stats[stat] ?? 15,
    total: (parameter, rate) => (parameter === 'healing' && rate ? healingRate : 0),
    mainhand: { item: DEFAULT_WEAPON, upgrade: 0 },
    offhand: null,
    armorPieces: [],
    hasUpcutStone: false,
  };
}

describe('Seraph healing rows (plan B7.3)', () => {
  const stats = { sta: 400, int: 200 };

  it('pins STA 400 / INT 200 without healing bonus at the listed max-level scaling', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 0), DEFAULT_ENGINE_OPTIONS);

    // Heal Rain 650 + floor(8.18 × 200); Gloria Patri 600 + floor(12.08 × 400) + 1000 synergy.
    expect(healed.healRain.total).toBe(2286);
    expect(healed.gloriaPatri.total).toBe(6432);
    expect(healed.gloriaPatriEffectIncrease.total).toBe(6732);
  });

  it('gives the Effect Increase variation the same scaling as Gloria Patri', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 0), DEFAULT_ENGINE_OPTIONS);

    // Only the flat HP differs (900 vs 600); the old level-shifted formula scaled them apart.
    expect(healed.gloriaPatriEffectIncrease.skillOutput - healed.gloriaPatri.skillOutput).toBe(300);
  });

  it('floors the scaled term exactly at a scale × stat that lands on an integer', () => {
    const healed = computeHealingSkills(
      data,
      healerContext({ int: 100 }, 0),
      DEFAULT_ENGINE_OPTIONS,
    );

    // 8.18 × 100 = 818 in decimal; floating-point drift must not floor it to 817.
    expect(healed.healRain.skillOutput).toBe(650 + 818);
  });

  it('scales by the healing rate after the synergy and reports the split', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 20), DEFAULT_ENGINE_OPTIONS);

    expect(healed.gloriaPatri).toEqual({ skillOutput: 6432, healingRate: 20, total: 7718 });
    expect(healed.gloriaPatriEffectIncrease.total).toBe(8078);
    expect(healed.healRain).toEqual({ skillOutput: 2286, healingRate: 20, total: 2743 });
  });

  it('leaves the Heal synergy out when switched off', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 0), {
      ...DEFAULT_ENGINE_OPTIONS,
      applyHealSynergy: false,
    });

    expect(healed.gloriaPatri.total).toBe(5432);
    expect(healed.gloriaPatriEffectIncrease.total).toBe(5732);
    expect(healed.healRain.total).toBe(2286);
  });
});
