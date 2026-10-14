import { CLASS_IDS, damageSkillFamiliesFor, isAnteriorJob, type GameData } from '@/data';

import { canDualWield, isSkillUnlocked } from '../../rules';
import type { EngineOptions } from '../options';
import type { StatContext } from '../stats/context';
import { computeBasicDamage } from './basic';
import { computeProcDamage } from './proc';
import { computeSkillDamage, isSkillUsable } from './skill';
import { overcritTarget, resolveDamageTarget } from './target';
import type { BasicDamage, DamageResults, ProcDamage, SkillDamage } from './types';

/**
 * Every damage number of one swap against the chosen target: the basic attack (not for the
 * magician chain — wand and staff basics are not worth a row), the left hand of a dual-wielder,
 * every curated skill the character has learned by its level and can use with its weapon, with
 * its variations (a variation needs its base's level), so the results view can pick any of them
 * without the engine knowing which is chosen, and the procs the gear can trigger (any job).
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
    if (!isSkillUnlocked(family.base, ctx.level)) {
      continue;
    }

    for (const skill of [family.base, ...family.variations]) {
      if (isSkillUsable(ctx, skill)) {
        skills[skill.id] = computeSkillDamage(ctx, skill, target, options);
      }
    }
  }

  const procs: Record<number, ProcDamage> = {};

  for (const skill of data.procSkills) {
    const proc = computeProcDamage(ctx, skill, target, options);

    if (proc !== null) {
      procs[skill.id] = proc;
    }
  }

  return { target, basic, leftHand, skills, procs };
}
