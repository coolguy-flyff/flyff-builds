import type { ResultsPage } from '@/domain/engine';
import type { VitalBreakdown } from '@/domain/engine';

/** DEX 15 / 8 × Seraph block factor 0.6 = 1.125, floored with no gear. */
const BARE_BLOCK = { fromDex: 1.125, fromGear: 0, total: 1 };

const ZERO_BREAKDOWN: VitalBreakdown = { base: 0, flat: 0, rate: 0, rateGain: 0, total: 0 };

/**
 * Hand-built results pages for unit tests of the pure results helpers. Every number is distinct
 * so a test can tell at a glance which field a cell came from.
 */

export const BASE_PAGE: ResultsPage = {
  str: 15,
  sta: 400,
  dex: 15,
  int: 15,
  hp: 32450,
  mp: 949,
  fp: 1272,
  movementSpeed: 100,
  jumpHeight: 100,
  castingSpeed: 100,
  attackSpeed: 42,
  actionSpeed: 0,
  attack: 217,
  magicAttack: 0,
  skillDamage: 0,
  pveDamage: 0,
  pvpDamage: 0,
  hitRate: 20,
  criticalChance: 1,
  // DEX 15 / 10 × Seraph factor 1 = 1.5, floored.
  criticalChanceBreakdown: { fromDex: 1, fromGear: 0, total: 1 },
  criticalDamage: 0,
  blockPenetration: 0,
  healing: 0,
  defenseMin: 561,
  defenseMax: 561,
  magicDefense: 845,
  magicResistance: 0,
  criticalResist: 0,
  incomingDamage: 0,
  pveDamageReduction: 0,
  pvpDamageReduction: 0,
  parry: 7,
  meleeBlock: 1,
  rangedBlock: 1,
  meleeBlockBreakdown: BARE_BLOCK,
  rangedBlockBreakdown: BARE_BLOCK,
  healingSkills: {
    healRain: { skillOutput: 2254, healingRate: 0, total: 2254 },
    gloriaPatri: { skillOutput: 6408, healingRate: 0, total: 6408 },
    gloriaPatriEffectIncrease: { skillOutput: 6740, healingRate: 0, total: 6740 },
  },
  hpBreakdown: ZERO_BREAKDOWN,
  mpBreakdown: ZERO_BREAKDOWN,
  fpBreakdown: ZERO_BREAKDOWN,
  rawTotals: {},
};

export function makePage(overrides: Partial<ResultsPage> = {}): ResultsPage {
  return { ...BASE_PAGE, ...overrides };
}

export function withPage(page: ResultsPage): { page: ResultsPage } {
  return { page };
}
