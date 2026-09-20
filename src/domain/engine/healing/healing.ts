import {
  GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID,
  GLORIA_PATRI_SKILL_ID,
  HEAL_RAIN_SKILL_ID,
  requireSkill,
  type GameData,
  type SlimSkill,
  type Synergy,
} from '@/data';

import type { EngineOptions } from '../options';
import { computeMaxLevelStatScale } from '../skills/statScale';
import type { StatContext } from '../stats/context';

/**
 * Healing per cast of a self-heal skill at its maximum level: the skill's flat HP plus the listed
 * max-level stat scaling (8.18 × INT for Heal Rain), plus the Heal synergy Flyffulator left as a
 * TODO (plan B7.3), switchable via {@link EngineOptions}, then the Healing % bonus.
 *
 * Flyffulator (flyffdamagecalculator.js:19-63) instead ports the level-shifted scaling of an
 * in-game bug that has since been fixed, so its heals come out slightly lower; the parity suite
 * accounts for that.
 */

const HEALED_PARAMETER = 'hp';

/**
 * Additive synergy with another skill assumed maxed, the floored flat-per-level reading the game
 * and Flyffulator use for buff synergies (flyffentity.js:1378-1380).
 */
function synergyBonus(synergy: Synergy): number {
  const bonusLevels = synergy.sourceLevelCount - synergy.minLevel;
  let bonus = 0;

  if (synergy.parameter === HEALED_PARAMETER && synergy.pve && synergy.add && bonusLevels > 0) {
    bonus = Math.floor(synergy.scale * bonusLevels);
  }

  return bonus;
}

/** A heal per cast, split the way the tooltip explains it (plan feedback 2026-09-03, item 4). */
export interface HealingBreakdown {
  /** The skill's own formula: base value, stat scaling and synergy — before the Healing % bonus. */
  readonly skillOutput: number;
  /** The Healing % total the output is multiplied by (×1.80 for +80 %). */
  readonly healingRate: number;
  readonly total: number;
}

const NO_HEALING: HealingBreakdown = Object.freeze({ skillOutput: 0, healingRate: 0, total: 0 });

export function computeSkillHealing(
  ctx: StatContext,
  skill: SlimSkill,
  options: EngineOptions,
): HealingBreakdown {
  const healed = skill.max.abilities.find((ability) => ability.parameter === HEALED_PARAMETER);
  let skillOutput = healed?.add ?? 0;
  let breakdown = NO_HEALING;

  if (skillOutput > 0) {
    skillOutput += computeMaxLevelStatScale(
      ctx,
      skill.max.scalingParameters,
      HEALED_PARAMETER,
      'pve',
    );

    if (options.applyHealSynergy) {
      for (const synergy of skill.max.synergies) {
        skillOutput += synergyBonus(synergy);
      }
    }

    const healingRate = ctx.total('healing', true);

    breakdown = {
      skillOutput,
      healingRate,
      total: Math.floor(skillOutput + (skillOutput * healingRate) / 100),
    };
  }

  return breakdown;
}

export interface HealingSkills {
  readonly healRain: HealingBreakdown;
  readonly gloriaPatri: HealingBreakdown;
  readonly gloriaPatriEffectIncrease: HealingBreakdown;
}

/** The three Seraph rows: Heal Rain, Gloria Patri and its Effect Increase variation. */
export function computeHealingSkills(
  data: GameData,
  ctx: StatContext,
  options: EngineOptions,
): HealingSkills {
  const healingOf = (skillId: number): HealingBreakdown =>
    computeSkillHealing(ctx, requireSkill(data, skillId), options);

  return {
    healRain: healingOf(HEAL_RAIN_SKILL_ID),
    gloriaPatri: healingOf(GLORIA_PATRI_SKILL_ID),
    gloriaPatriEffectIncrease: healingOf(GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID),
  };
}
