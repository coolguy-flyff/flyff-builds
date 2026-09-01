import { clamp } from '@/lib/math';

import type { StatContext } from './context';

/** A player's movement speed factor is 100 % before bonuses (flyffentity.js:745-753). */
export function computeMovementSpeed(ctx: StatContext): number {
  let speed = 100;
  const speedBonus = ctx.total('speed', true);

  if (speedBonus !== 0) {
    speed += (speed * speedBonus) / 100;
  }

  return Math.floor(Math.max(speed, 0));
}

/** calculations.jsx:289 (FLYFFULATOR_QUIRKS.jumpHeightNotRounded) */
export function computeJumpHeight(ctx: StatContext): number {
  return (ctx.total('jumpheight', false) + 200) / 2;
}

/** calculations.jsx:295 */
export function computeCastingSpeed(ctx: StatContext): number {
  return 100 + ctx.total('decreasedcastingtime', true);
}

/** Bonus per 10 points of base attack speed (flyffentity.js:763-768). */
const ATTACK_SPEED_PLUS = [
  0.08, 0.16, 0.24, 0.32, 0.4, 0.48, 0.56, 0.64, 0.72, 0.8, 0.88, 0.96, 1.04, 1.12, 1.2, 1.3, 1.38,
  1.5,
] as const;

const MIN_BASE_SPEED = 0.125;
const MAX_BASE_SPEED = 2.0;
const BASE_SPEED_SCALING = 200.0;

/** The attack-speed multiplier in `[0.1, 2.0]` (flyffentity.js:758-798). */
export function computeAttackSpeedFactor(ctx: StatContext): number {
  const weaponAttackSpeed = ctx.mainhand.item.attackSpeedValue ?? 0;
  const statScale = 4 * ctx.base('dex') + ctx.level / 8;
  const baseDividend = BASE_SPEED_SCALING * MIN_BASE_SPEED;
  const maxBaseScaledSpeed = BASE_SPEED_SCALING - baseDividend / MAX_BASE_SPEED;
  const baseSpeed = Math.floor(
    Math.min(ctx.job.attackSpeed + weaponAttackSpeed * statScale, maxBaseScaledSpeed),
  );

  let speed = baseDividend / (BASE_SPEED_SCALING - baseSpeed);
  const plusIndex = Math.floor(clamp(baseSpeed / 10, 0, ATTACK_SPEED_PLUS.length - 1));

  speed += ATTACK_SPEED_PLUS[plusIndex] ?? 0;
  speed += (ctx.total('attackspeed', true) / 1000) * 20;

  const attackSpeedRate = ctx.total('attackspeedrate', true);

  if (attackSpeedRate > 0) {
    speed += (speed * attackSpeedRate) / 100;
  }

  return clamp(speed, 0.1, MAX_BASE_SPEED);
}

/** The character-window percentage (calculations.jsx:338). */
export function attackSpeedPercent(factor: number): number {
  return Math.floor(factor * 100) / 2;
}
