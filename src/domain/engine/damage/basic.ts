import type { EngineOptions } from '../options';
import { computeHitMinMax } from '../stats/attack';
import { computeCriticalChanceBreakdown } from '../stats/combat';
import type { StatContext } from '../stats/context';
import type { EquippedItem } from '../types';
import { attackFromPower, attackMultiplier } from './attack';
import {
  applyAttackDefense,
  applyPartySkill,
  finishDamage,
  partySkillBonusPercent,
  pvpDamageFactor,
} from './defense';
import { mapRange, rangeAverage } from './range';
import type { BasicDamage, DamageRange, DamageTarget } from './types';

/**
 * Basic attacks (flyffdamagecalculator.js:372-421, 951-1008): the hit range through the attack
 * multiplier, the target's defense, the per-attack factor and the post multipliers; crits on top.
 */

export type Hand = 'mainhand' | 'offhand';

/** Crit factor range against a target of at least the attacker's level (DC:968-969). */
const CRIT_FACTOR: DamageRange = { min: 1.1, max: 1.4 };
/** Crit factor range of a player out-levelling a monster (DC:975-978). */
const OVERCRIT_FACTOR: DamageRange = { min: 1.2, max: 2.0 };
const MIN_CRIT_BONUS = 0.1;
/** A left-hand hit deals 75 % plus the left-hand damage % (DC:617-619). */
const LEFT_HAND_BASE_FACTOR = 0.75;

interface HitAgainst {
  readonly hit: DamageRange;
  readonly crit: DamageRange;
}

function weaponInHand(ctx: StatContext, hand: Hand): EquippedItem | null {
  let weapon: EquippedItem | null = ctx.mainhand;

  if (hand === 'offhand') {
    weapon = ctx.offhand?.kind === 'weapon' ? ctx.offhand : null;
  }

  return weapon;
}

/** The factors applied after the defense, in Flyffulator's order (DC:600-650). */
function perAttackFactor(ctx: StatContext, target: DamageTarget, hand: Hand): number {
  let factor = pvpDamageFactor(target.mode);

  if (hand === 'offhand') {
    factor *= LEFT_HAND_BASE_FACTOR + ctx.total('lefthanddamage', true) / 100;
  }

  factor *= 1 + ctx.total('autoattackdamage', true) / 100;

  return factor;
}

/** The game rolls the crit factor as `min + r × (max − min)`; spelled the same way for parity. */
function critFactorAt(range: DamageRange, roll: number): number {
  return range.min + roll * (range.max - range.min);
}

/**
 * The crit chance against a target: crit resist scales it down multiplicatively (DC:1041-1051).
 * The `pvpcriticalchance` stat of that path has no bundled source and is left out.
 */
function criticalChanceAgainst(criticalChance: number, target: DamageTarget): number {
  return criticalChance * Math.min(1, 1 - target.criticalResist / 100);
}

/** One hand's attack range against a target: the normal hit and the crit with `critFactor`. */
function hitAgainst(
  ctx: StatContext,
  attack: DamageRange,
  target: DamageTarget,
  factor: number,
  critBonus: number,
  critFactor: DamageRange,
  options: EngineOptions,
): HitAgainst {
  const damage = mapRange(attack, (value) =>
    applyPartySkill(Math.max(applyAttackDefense(value, target.defense.basic), 0), target, options),
  );
  const finish = (value: number): number =>
    finishDamage(Math.floor(value * factor), ctx, target, options);

  return {
    hit: mapRange(damage, finish),
    crit: {
      min: finish(Math.floor(critFactorAt(critFactor, 0) * critBonus * damage.min)),
      max: finish(Math.floor(critFactorAt(critFactor, 1) * critBonus * damage.max)),
    },
  };
}

/**
 * The basic attack of one hand; null when the hand holds no weapon. `overcrit` is the crit against
 * the lower-level target (a monster one level below), which the row shows next to the crit.
 */
export function computeBasicDamage(
  ctx: StatContext,
  target: DamageTarget,
  overcrit: DamageTarget | null,
  hand: Hand,
  options: EngineOptions,
): BasicDamage | null {
  const weapon = weaponInHand(ctx, hand);
  let result: BasicDamage | null = null;

  if (weapon !== null) {
    const multiplier = attackMultiplier(ctx, null);
    const attack = mapRange(computeHitMinMax(ctx, weapon), (roll) =>
      attackFromPower(ctx, roll, multiplier, target.mode),
    );
    const factor = perAttackFactor(ctx, target, hand);
    const critBonus = Math.max(MIN_CRIT_BONUS, 1 + ctx.total('criticaldamage', true) / 100);
    const criticalChance = computeCriticalChanceBreakdown(ctx).total;
    const against = hitAgainst(ctx, attack, target, factor, critBonus, CRIT_FACTOR, options);

    result = {
      hit: against.hit,
      average: rangeAverage(against.hit),
      crit: against.crit,
      overcrit:
        overcrit === null
          ? null
          : hitAgainst(ctx, attack, overcrit, factor, critBonus, OVERCRIT_FACTOR, options).crit,
      criticalChance: criticalChanceAgainst(criticalChance, target),
      breakdown: {
        attack,
        attackMultiplier: multiplier,
        defense: target.defense.basic,
        critBonus,
        factor,
        criticalChance,
        criticalResist: target.criticalResist,
        partyBonus: target.mode === 'pve' ? partySkillBonusPercent(options.partySkill) : 0,
      },
    };
  }

  return result;
}
