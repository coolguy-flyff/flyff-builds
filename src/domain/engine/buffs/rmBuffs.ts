import { RM_BUFF_SKILL_IDS, requireSkill, type GameData, type SlimSkill } from '@/data';
import { requireDefined } from '@/lib/assert';

import type { RmBuffs } from '../../build/schema';
import { contribution, origin } from '../abilities/collect';
import type { Contribution } from '../abilities/types';

/**
 * A buff at its maximum level with every stat scaling at its cap
 * (FLYFFULATOR_QUIRKS.buffScalingAtCap; flyffentity.js:1348-1437). Synergies are skipped
 * (FLYFFULATOR_QUIRKS.buffSynergiesNeedSkillLevels).
 */
export function maxBuffContributions(skill: SlimSkill): Contribution[] {
  const source = origin('rmBuff', skill.name, { skillId: skill.id });
  const scaledParameters = new Set<string>();
  const contributions: Contribution[] = [];

  for (const ability of skill.max.abilities) {
    let add = ability.add;

    for (const scale of skill.max.scalingParameters) {
      if (scale.parameter !== ability.parameter || scaledParameters.has(ability.parameter)) {
        continue;
      }

      scaledParameters.add(ability.parameter);

      if (scale.stat === undefined) {
        // Equipment-part scaling is unimplemented in Flyffulator too (flyffentity.js:1426-1430).
        continue;
      }

      const cap = requireDefined(
        scale.maximum,
        `Buff ${skill.name} scales ${scale.parameter} by ${scale.stat} without a maximum`,
      );

      add += scale.add ? Math.floor(cap) : Math.floor((add * cap) / 10);
    }

    contributions.push(contribution(ability.parameter, add, ability.rate, source));
  }

  return contributions;
}

/** Every RM buff not switched off individually, when the master switch is on. */
export function rmBuffContributions(data: GameData, rmBuffs: RmBuffs): Contribution[] {
  const contributions: Contribution[] = [];

  if (rmBuffs.enabled) {
    const excluded = new Set(rmBuffs.excludedSkillIds);

    for (const skillId of RM_BUFF_SKILL_IDS) {
      if (!excluded.has(skillId)) {
        contributions.push(...maxBuffContributions(requireSkill(data, skillId)));
      }
    }
  }

  return contributions;
}
