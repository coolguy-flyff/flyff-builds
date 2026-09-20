import { CLASS_IDS, damageSkillFamiliesFor, isAnteriorJob, type GameData } from '@/data';

import { canDualWield } from '../../rules';
import type { EngineOptions } from '../options';
import type { StatContext } from '../stats/context';
import { computeBasicDamage } from './basic';
import { computeSkillDamage, isSkillUsable } from './skill';
import { overcritTarget, resolveDamageTarget } from './target';
import type { BasicDamage, DamageResults, SkillDamage } from './types';

/**
 * Every damage number of one swap against the chosen target: the basic attack (not for the
 * magician chain — wand and staff basics are not worth a row), the left hand of a dual-wielder,
 * and every usable curated skill with its variations, so the results view can pick any of them
 * without the engine knowing which is chosen.
 */
export function computeDamageResults(
  data: GameData,
  ctx: StatContext,
  options: EngineOptions,
): DamageResults {
  const target = resolveDamageTarget(options.target, ctx.level, options.customTargets);
  const lower = overcritTarget(target);
  const magician = isAnteriorJob(data, ctx.job.id, CLASS_IDS.magician);
  let basic: BasicDamage | null = null;
  let leftHand: BasicDamage | null = null;

  if (!magician) {
    basic = computeBasicDamage(ctx, target, lower, 'mainhand', options);

    if (canDualWield(data, ctx.job.id)) {
      leftHand = computeBasicDamage(ctx, target, lower, 'offhand', options);
    }
  }

  const skills: Record<number, SkillDamage> = {};

  for (const family of damageSkillFamiliesFor(data, ctx.job.id)) {
    for (const skill of [family.base, ...family.variations]) {
      if (isSkillUsable(ctx, skill)) {
        skills[skill.id] = computeSkillDamage(ctx, skill, target, options);
      }
    }
  }

  return { target, basic, leftHand, skills };
}
