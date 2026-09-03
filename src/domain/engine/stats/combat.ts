import { clamp } from '@/lib/math';

import type { StatContext } from './context';

/**
 * Hit rate is computed against Flyffulator's Training Dummy (flyffutils.js:16-43): its level is
 * hidden (treated as the player's) and its parry is 82.
 */
export const TRAINING_DUMMY = Object.freeze({ parry: 82 });

/** Rows below this are not shown by the game; Flyffulator clamps hit rate to this range. */
const HIT_RATE_MIN = 20;
const HIT_RATE_MAX = 96;

/**
 * The game's floor and ceiling for the effective block chance (calculations.jsx:428-434). The
 * results show block before the attacker is known, so these only appear in the row's explanation.
 */
export const BLOCK_EFFECTIVE_MIN = 6.25;
export const BLOCK_EFFECTIVE_MAX = 92.5;

/** The most the DEX difference against an attacker can add to block (flyffentity.js:1650-1651). */
export const BLOCK_DEX_BONUS_MAX = 10;

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

/**
 * Block before the attacker is known (plan feedback 2026-09-03): the attacker-independent terms
 * of the game's block formula (flyffentity.js:1635-1686), uncapped.
 */
export interface BlockBreakdown {
  /** `DEX / 8 × job factor` — the character's own DEX. */
  readonly fromDex: number;
  /** The melee or ranged block % from equipment and buffs (`block` counts for both). */
  readonly fromGear: number;
  /** `floor(fromDex + fromGear)`, at least 0. */
  readonly total: number;
}

/**
 * Left out on purpose because they need an attacker: the level term `L / ((L + attackerL) × 15)`,
 * the DEX-difference term (at most +10), the halving against giants, the attacker's block
 * penetration and the 6.25–92.5% clamp. The user applies those to this number.
 */
export function computeBlockBreakdown(ctx: StatContext, ranged: boolean): BlockBreakdown {
  const fromDex = (ctx.base('dex') / 8) * ctx.job.block;
  const fromGear = ctx.total(ranged ? 'rangedblock' : 'meleeblock', true);

  return { fromDex, fromGear, total: Math.max(Math.floor(fromDex + fromGear), 0) };
}
