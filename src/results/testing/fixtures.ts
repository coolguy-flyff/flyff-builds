import type { ResultsPage } from '@/domain/engine';

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
  attack: 217,
  magicAttack: 0,
  skillDamage: 0,
  pveDamage: 0,
  pvpDamage: 0,
  hitRate: 20,
  criticalChance: 1,
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
  meleeBlock: 6.25,
  rangedBlock: 6.25,
  healingSkills: { healRain: 2254, gloriaPatri: 6408, gloriaPatriEffectIncrease: 6740 },
  rawTotals: {},
};

export function makePage(overrides: Partial<ResultsPage> = {}): ResultsPage {
  return { ...BASE_PAGE, ...overrides };
}

export function withPage(page: ResultsPage): { page: ResultsPage } {
  return { page };
}
