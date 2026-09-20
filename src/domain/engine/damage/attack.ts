import type { DamageSkill } from '@/data';

import type { StatContext } from '../stats/context';
import type { DamageMode } from './types';

/** Upcut Stone multiplies the attack of every hit (flyffdamagecalculator.js:445-452). */
const UPCUT_STONE_FACTOR = 1.2;

function isThirdJobClass(ctx: StatContext, classId: number): boolean {
  return ctx.data.classes.get(classId)?.type === 'specialist';
}

/**
 * `getAttackMultiplier` (flyffdamagecalculator.js:423-455): attack % for every hit, plus skill
 * damage % (and third-job skill damage % for a third job's skill) for skills, times Upcut.
 */
export function attackMultiplier(ctx: StatContext, skill: DamageSkill | null): number {
  let sumPower = ctx.total('attack', true);

  if (skill !== null) {
    sumPower += ctx.total('skilldamage', true);

    if (isThirdJobClass(ctx, skill.classId)) {
      sumPower += ctx.total('thirdjobskilldamage', true);
    }
  }

  let factor = 1 + sumPower / 100;

  if (ctx.hasUpcutStone) {
    factor *= UPCUT_STONE_FACTOR;
  }

  return factor;
}

/** `computeAttack` (flyffdamagecalculator.js:372-421) from a rolled hit or skill power. */
export function attackFromPower(
  ctx: StatContext,
  power: number,
  multiplier: number,
  mode: DamageMode,
): number {
  let attack = Math.floor(power * multiplier);

  attack += ctx.total('attack', false);

  if (mode === 'pve') {
    attack += ctx.total('pvedamage', false);
  }

  return Math.max(attack, 0);
}
