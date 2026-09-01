import {
  GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID,
  GLORIA_PATRI_SKILL_ID,
  HEAL_RAIN_SKILL_ID,
  requireSkill,
  type GameData,
  type ScalingParameter,
  type SlimSkill,
  type Synergy,
} from '@/data';

import type { EngineOptions } from '../options';
import type { StatContext } from '../stats/context';
import { computeHp } from '../stats/vitals';

/**
 * Healing per cast of a self-heal skill at its maximum level. Port of
 * flyffdamagecalculator.js:19-63 and `getStatScale` (flyffentity.js:1736-1809), plus the
 * Heal synergy Flyffulator left as a TODO (plan B7.3), switchable via {@link EngineOptions}.
 */

const HEALED_PARAMETER = 'hp';

export interface HealingSkillSpec {
  readonly skill: SlimSkill;
  /**
   * Level fed to the stat scaling: 1 for a base skill, the inherited skill's level count for a
   * master variation (flyffdamagecalculator.js:43-53 — "not 0-indexed, small bug ingame").
   */
  readonly statScaleSkillLevel: number;
}

function referencedStat(ctx: StatContext, scale: ScalingParameter): number {
  let value = 0;

  if (scale.stat === 'hp') {
    value = computeHp(ctx);
  } else if (scale.stat !== undefined) {
    value = ctx.base(scale.stat);
  }

  // FLYFFULATOR_QUIRKS.statScaleIgnoresMaximum: the cap is never applied.
  return value;
}

/** flyffentity.js:1736-1809 for `parameter = hp`, PvE context. */
function statScale(ctx: StatContext, spec: HealingSkillSpec, realScaleLevel: number): number {
  let total = 0;

  for (const scale of spec.skill.max.scalingParameters) {
    if (scale.parameter !== HEALED_PARAMETER || !scale.pve) {
      continue;
    }

    const statValue = referencedStat(ctx, scale);
    const realScale = Math.floor((scale.scale * 50 - realScaleLevel) / 5);

    if (scale.add) {
      total += Math.floor(
        (realScale / 10) * statValue + spec.statScaleSkillLevel * (statValue / 50),
      );
    }
  }

  return total;
}

/**
 * Additive synergy with another skill assumed maxed, the flat-per-level reading Flyffulator uses
 * for buff synergies (flyffentity.js:1378-1380).
 */
function synergyBonus(data: GameData, synergy: Synergy): number {
  const sourceLevel = requireSkill(data, synergy.skill).levelCount;
  const bonusLevels = sourceLevel - synergy.minLevel;
  let bonus = 0;

  if (synergy.parameter === HEALED_PARAMETER && synergy.pve && synergy.add && bonusLevels > 0) {
    bonus = Math.floor(synergy.scale * bonusLevels);
  }

  return bonus;
}

export function computeSkillHealing(
  data: GameData,
  ctx: StatContext,
  spec: HealingSkillSpec,
  options: EngineOptions,
): number {
  const skillLevel = spec.skill.levelCount;
  const healed = spec.skill.max.abilities.find((ability) => ability.parameter === HEALED_PARAMETER);
  let add = healed?.add ?? 0;

  if (add <= 0) {
    return 0;
  }

  add += statScale(ctx, spec, skillLevel - 1);

  if (options.applyHealSynergy) {
    for (const synergy of spec.skill.max.synergies) {
      add += synergyBonus(data, synergy);
    }
  }

  add += (add * ctx.total('healing', true)) / 100;

  return Math.floor(add);
}

export interface HealingSkills {
  readonly healRain: number;
  readonly gloriaPatri: number;
  readonly gloriaPatriEffectIncrease: number;
}

/** The three Seraph rows: Heal Rain, Gloria Patri and its Effect Increase variation. */
export function computeHealingSkills(
  data: GameData,
  ctx: StatContext,
  options: EngineOptions,
): HealingSkills {
  const gloriaPatri = requireSkill(data, GLORIA_PATRI_SKILL_ID);

  return {
    healRain: computeSkillHealing(
      data,
      ctx,
      { skill: requireSkill(data, HEAL_RAIN_SKILL_ID), statScaleSkillLevel: 1 },
      options,
    ),
    gloriaPatri: computeSkillHealing(
      data,
      ctx,
      { skill: gloriaPatri, statScaleSkillLevel: 1 },
      options,
    ),
    gloriaPatriEffectIncrease: computeSkillHealing(
      data,
      ctx,
      {
        skill: requireSkill(data, GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID),
        statScaleSkillLevel: gloriaPatri.levelCount,
      },
      options,
    ),
  };
}
