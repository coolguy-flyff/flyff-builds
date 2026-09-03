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
    armorPieces: [],
    hasUpcutStone: false,
  };
}

describe('Seraph healing rows (plan B7.3)', () => {
  const stats = { sta: 400, int: 200 };

  it('pins STA 400 / INT 200 without healing bonus', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 0), DEFAULT_ENGINE_OPTIONS);

    expect(healed.healRain.total).toBe(2254);
    expect(healed.gloriaPatri.total).toBe(6408);
    expect(healed.gloriaPatriEffectIncrease.total).toBe(6740);
  });

  it('scales by the healing rate after the synergy and reports the split', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 20), DEFAULT_ENGINE_OPTIONS);

    expect(healed.gloriaPatri).toEqual({ skillOutput: 6408, healingRate: 20, total: 7689 });
    expect(healed.gloriaPatriEffectIncrease.total).toBe(8088);
    expect(healed.healRain).toEqual({ skillOutput: 2254, healingRate: 20, total: 2704 });
  });

  it('matches Flyffulator when the Heal synergy is switched off', () => {
    const healed = computeHealingSkills(data, healerContext(stats, 0), {
      ...DEFAULT_ENGINE_OPTIONS,
      applyHealSynergy: false,
    });

    expect(healed.gloriaPatri.total).toBe(5408);
    expect(healed.gloriaPatriEffectIncrease.total).toBe(5740);
    expect(healed.healRain.total).toBe(2254);
  });
});
