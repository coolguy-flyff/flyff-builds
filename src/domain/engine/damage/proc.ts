import { skillChanceParameter, type AttackSkill } from '@/data';

import type { EngineOptions } from '../options';
import type { StatContext } from '../stats/context';
import { computeSkillDamage } from './skill';
import type { DamageMode, DamageTarget, ProcDamage } from './types';

/**
 * Skills the gear triggers by chance on a hit (Waterbomb). Flyffulator lists Waterbomb as a
 * level-1 skill whenever the attacker has a chance for it (calculations.jsx:76-79) and runs it
 * through the ordinary skill formula as a magic skill; this does the same.
 */

/** The skill's trigger chance %: the chance for both modes plus the one limited to `mode`. */
export function procChance(ctx: StatContext, skillId: number, mode: DamageMode): number {
  return (
    ctx.total(skillChanceParameter(skillId), true) +
    ctx.total(skillChanceParameter(skillId, mode), true)
  );
}

/** One proc's hit on the target, or null when the gear gives no chance to trigger it. */
export function computeProcDamage(
  ctx: StatContext,
  skill: AttackSkill,
  target: DamageTarget,
  options: EngineOptions,
): ProcDamage | null {
  const chance = procChance(ctx, skill.id, target.mode);
  let proc: ProcDamage | null = null;

  if (chance > 0) {
    proc = { ...computeSkillDamage(ctx, skill, target, options), chance };
  }

  return proc;
}
