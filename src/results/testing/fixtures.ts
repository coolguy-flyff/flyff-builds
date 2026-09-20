import { trainingDummyTarget, type DamageResults, type ResultsPage } from '@/domain/engine';
import type { VitalBreakdown } from '@/domain/engine';

/** DEX 15 / 8 × Seraph block factor 0.6 = 1.125, floored with no gear. */
const BARE_BLOCK = { fromDex: 1.125, fromGear: 0, total: 1 };

/**
 * The bare Seraph's fists against the Lv 190 dummy (defense 185): hits 216–218 lose 201–203 to
 * the defense, so 15 per hit; crits 1.1–1.4×, overcrits 1.2–2.0× on 15–16 against the Lv 189 dummy.
 */
export const BARE_DAMAGE: DamageResults = {
  target: trainingDummyTarget(190),
  basic: {
    hit: { min: 15, max: 15 },
    average: 15,
    crit: { min: 16, max: 21 },
    overcrit: { min: 18, max: 32 },
    criticalChance: 1,
    breakdown: {
      attack: { min: 216, max: 218 },
      attackMultiplier: 1,
      defense: 185,
      critBonus: 1,
      factor: 1,
      criticalChance: 1,
      criticalResist: 0,
      partyBonus: 0,
    },
  },
  leftHand: null,
  skills: {},
};

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
    healRain: { skillOutput: 2286, healingRate: 0, total: 2286 },
    gloriaPatri: { skillOutput: 6432, healingRate: 0, total: 6432 },
    gloriaPatriEffectIncrease: { skillOutput: 6732, healingRate: 0, total: 6732 },
  },
  hpBreakdown: ZERO_BREAKDOWN,
  mpBreakdown: ZERO_BREAKDOWN,
  fpBreakdown: ZERO_BREAKDOWN,
  damage: BARE_DAMAGE,
  rawTotals: {},
};

export function makePage(overrides: Partial<ResultsPage> = {}): ResultsPage {
  return { ...BASE_PAGE, ...overrides };
}

export function withPage(page: ResultsPage): { page: ResultsPage } {
  return { page };
}
