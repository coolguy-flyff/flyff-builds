import type { SlimSkill } from '@/data';

import { contribution, origin } from '../abilities/collect';
import type { Contribution, ContributionOriginKind } from '../abilities/types';

/**
 * A buff or passive applied "maxed" (plan feedback 2026-09-03, item 1): its maximum level, every
 * synergy source at its own maximum level, and every caster-stat scaling at its cap
 * (FLYFFULATOR_QUIRKS.buffScalingAtCap; flyffentity.js:1348-1437).
 *
 * Skipped on purpose: scalings by equipment part (unimplemented in Flyffulator too,
 * flyffentity.js:1426-1430), by an arbitrary stat such as `auraeffect` (nothing feeds it here),
 * and caster-stat scalings without a cap — those would need the caster's live stat, which the
 * "maxed" model has no notion of. The data pipeline asserts the RM buffs are all capped.
 */
export function maxedSkillContributions(
  skill: SlimSkill,
  kind: ContributionOriginKind,
): Contribution[] {
  const source = origin(kind, skill.name, { skillId: skill.id });
  const scaledParameters = new Set<string>();
  const contributions: Contribution[] = [];

  for (const ability of skill.max.abilities) {
    let add = ability.add;

    // Synergies (flyffentity.js:1367-1384) with the source skill assumed maxed. The bonus is
    // floored like the game does: Heaven's Step (Critical Resistance) is 5% + floor(0.5 × 5) = 7%
    // (FLYFFULATOR_QUIRKS.buffSynergiesFlatPerLevel).
    for (const synergy of skill.max.synergies) {
      const bonusLevels = synergy.sourceLevelCount - synergy.minLevel;

      if (synergy.parameter !== ability.parameter || bonusLevels <= 0) {
        continue;
      }

      if (synergy.add) {
        add += Math.floor(synergy.scale * bonusLevels);
      } else {
        add *= Math.floor(1 + (synergy.scale * bonusLevels) / 100);
      }
    }

    // Caster-stat scalings at their cap; only the first scaling per parameter applies.
    for (const scale of skill.max.scalingParameters) {
      if (scale.parameter !== ability.parameter || scaledParameters.has(ability.parameter)) {
        continue;
      }

      scaledParameters.add(ability.parameter);

      if (scale.stat === undefined || scale.maximum === undefined) {
        continue;
      }

      add += scale.add ? Math.floor(scale.maximum) : Math.floor((add * scale.maximum) / 10);
    }

    contributions.push(contribution(ability.parameter, add, ability.rate, source));
  }

  return contributions;
}
