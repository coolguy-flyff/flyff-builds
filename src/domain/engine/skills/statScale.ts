import type { ScalingParameter, ScalingPart, SlimItem, Synergy } from '@/data';

import type { StatContext } from '../stats/context';
import { computeHp } from '../stats/vitals';

/**
 * Caster-stat scalings and synergies of a skill at a known level (flyffentity.js:1701-1809),
 * shared by the healing and damage formulas.
 */

export type SkillMode = 'pve' | 'pvp';

export interface StatScaleSpec {
  readonly parameter: string;
  readonly mode: SkillMode;
  /** The level term of the formula (the skill level for damage skills). */
  readonly level: number;
  /** The level subtracted inside `realScale`. */
  readonly realScaleLevel: number;
}

interface ModeFlags {
  readonly pve: boolean;
  readonly pvp: boolean;
}

function appliesInMode(entry: ModeFlags, mode: SkillMode): boolean {
  return mode === 'pve' ? entry.pve : entry.pvp;
}

/** The average attack of a weapon (or defense of a shield) worn in the part; 0 when empty. */
function partValue(ctx: StatContext, part: ScalingPart): number {
  const item: SlimItem | undefined =
    part === 'righthandweapon' ? ctx.mainhand.item : ctx.offhand?.item;
  let value = 0;

  if (item !== undefined) {
    if (item.category === 'weapon') {
      value = ((item.minAttack ?? 0) + (item.maxAttack ?? 0)) / 2;
    } else {
      value = ((item.minDefense ?? 0) + (item.maxDefense ?? 0)) / 2;
    }
  }

  return value;
}

function referencedStat(ctx: StatContext, scale: ScalingParameter): number {
  let value = 0;

  if (scale.stat === 'hp') {
    value = computeHp(ctx);
  } else if (scale.stat !== undefined) {
    value = ctx.base(scale.stat);
  } else if (scale.part !== undefined) {
    value = partValue(ctx, scale.part);
  }

  // FLYFFULATOR_QUIRKS.statScaleIgnoresMaximum: the cap is never applied.
  return value;
}

function additiveScalings(
  scalings: readonly ScalingParameter[],
  parameter: string,
  mode: SkillMode,
): ScalingParameter[] {
  return scalings.filter(
    (scale) => scale.parameter === parameter && appliesInMode(scale, mode) && scale.add,
  );
}

/**
 * `getStatScale` (flyffentity.js:1736-1809) for one parameter in one mode. Multiplicative
 * (`add: false`) scalings are unimplemented in Flyffulator too and contribute nothing.
 */
export function computeStatScale(
  ctx: StatContext,
  scalings: readonly ScalingParameter[],
  spec: StatScaleSpec,
): number {
  let total = 0;

  for (const scale of additiveScalings(scalings, spec.parameter, spec.mode)) {
    const statValue = referencedStat(ctx, scale);
    const realScale = Math.floor((scale.scale * 50 - spec.realScaleLevel) / 5);

    total += Math.floor((realScale / 10) * statValue + spec.level * (statValue / 50));
  }

  return total;
}

/** Scales in the game data carry two decimals (8.18, 12.08); `8.18 × 200` must floor to 1636. */
const SCALE_PRECISION = 100;

/**
 * The listed max-level scaling, `floor(scale × stat)` per additive scaling parameter. The game
 * used to compute a level-shifted scale (the "small bug ingame" that `computeStatScale` still
 * mirrors for Flyffulator parity of damage skills); healing has been fixed to the listed scale.
 */
export function computeMaxLevelStatScale(
  ctx: StatContext,
  scalings: readonly ScalingParameter[],
  parameter: string,
  mode: SkillMode,
): number {
  let total = 0;

  for (const scale of additiveScalings(scalings, parameter, mode)) {
    const scaleHundredths = Math.round(scale.scale * SCALE_PRECISION);

    total += Math.floor((scaleHundredths * referencedStat(ctx, scale)) / SCALE_PRECISION);
  }

  return total;
}

/**
 * `addSkillSynergy` (flyffentity.js:1701-1734) with every source skill at its maximum level.
 * Unfloored, unlike the buff synergies (FLYFFULATOR_QUIRKS.attackSynergiesUnfloored).
 */
export function applySkillSynergies(
  value: number,
  synergies: readonly Synergy[],
  parameter: string,
  mode: SkillMode,
): number {
  let out = value;

  for (const synergy of synergies) {
    const bonusLevels = synergy.sourceLevelCount - synergy.minLevel;

    if (synergy.parameter !== parameter || !appliesInMode(synergy, mode) || bonusLevels <= 0) {
      continue;
    }

    if (synergy.add) {
      out += (bonusLevels * synergy.scale) / 100;
    } else {
      out *= 1 + (bonusLevels * synergy.scale) / 100;
    }
  }

  return out;
}
