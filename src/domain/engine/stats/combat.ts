import { clamp } from '@/lib/math';

import type { StatContext } from './context';

/**
 * Hit rate and block are computed against Flyffulator's Training Dummy (flyffutils.js:16-43): its
 * level is hidden (treated as the player's), parry 82 and DEX 1, rank `captain` (no giant halving).
 */
export const TRAINING_DUMMY = Object.freeze({ parry: 82, dex: 1 });

/** Rows below this are not shown by the game; Flyffulator clamps hit rate to this range. */
const HIT_RATE_MIN = 20;
const HIT_RATE_MAX = 96;

/** Displayed block chance is clamped to the game's floor/ceiling (calculations.jsx:428-434). */
export const BLOCK_DISPLAY_MIN = 6.25;
export const BLOCK_DISPLAY_MAX = 92.5;

export interface HitRate {
  /** Raw hit probability before the `hitrate` bonus and the clamp. */
  readonly prob: number;
  /** The displayed value. */
  readonly probAdjusted: number;
}

/** flyffentity.js:930-966 (player vs. monster branch, defender level hidden) */
export function computeHitRate(ctx: StatContext): HitRate {
  const attackerLevel = ctx.level;
  const defenderLevel = ctx.level;
  const factor = 1.6 * 1.5 * ((attackerLevel * 1.2) / (attackerLevel + defenderLevel));
  const attackerHitRate = ctx.base('dex');
  const defenderParry = Math.floor((TRAINING_DUMMY.parry * ctx.level) / 100);
  const hitRate = attackerHitRate / (attackerHitRate + defenderParry);
  const prob = Math.floor(hitRate * factor * 100);

  return {
    prob,
    probAdjusted: clamp(prob + ctx.total('hitrate', true), HIT_RATE_MIN, HIT_RATE_MAX),
  };
}

/** flyffentity.js:1608-1628 at full health, no party Precision (FLYFFULATOR_QUIRKS.criticalChanceNotFloored) */
export function computeCriticalChance(ctx: StatContext): number {
  let chance = ctx.base('dex') / 10;

  chance = Math.floor(chance * ctx.job.critical);
  chance += ctx.total('criticalchance', true);

  return Math.max(chance, 0);
}

/** flyffentity.js:915-924 */
export function computeParry(ctx: StatContext): number {
  return Math.floor(ctx.base('dex') * 0.5) + ctx.total('parry', true);
}

/** Raw block rate against the dummy attacker (flyffentity.js:1635-1686, player branch). */
export function computeBlockChance(ctx: StatContext, ranged: boolean): number {
  const dex = ctx.base('dex');
  const attackerLevel = ctx.level;
  const blockLevel = ctx.level / ((ctx.level + attackerLevel) * 15);
  const attackerDex = 15 + ((TRAINING_DUMMY.dex - 15) * ctx.level) / 100;
  let blockDex = (dex + attackerDex + 2) * ((dex - attackerDex) / 800);

  blockDex = Math.min(blockDex, 10);

  const blockBase = Math.max(blockLevel + blockDex, 0);
  const blockJob = (dex / 8) * ctx.job.block;
  const blockBonus = ctx.total(ranged ? 'rangedblock' : 'meleeblock', true);
  let blockRate = Math.floor(blockJob + blockBase + blockBonus);

  blockRate = Math.max(blockRate, 0);

  // The dummy has no block penetration: `floor(rate * (1 - 0))` is the rate itself.
  return blockRate;
}

export function blockChancePercent(blockRate: number): number {
  return clamp(blockRate, BLOCK_DISPLAY_MIN, BLOCK_DISPLAY_MAX);
}
