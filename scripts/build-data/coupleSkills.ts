import type { CoupleSkill } from '../../src/data/schema';

import {
  maxLevelOf,
  normalizeAbilities,
  ProjectionError,
  requireRawSkill,
  type SkillLookup,
} from './project';
import type { RawCouple } from './source';

/**
 * Couple skills: the buffs a couple unlocks by couple level (/couple lists them with the level;
 * Skills.json holds their effects). Each has a single level, so its abilities are the skill.
 * Skills without abilities would be dead toggles and fail the build instead.
 */
export function projectCoupleSkills(couple: RawCouple, lookup: SkillLookup): CoupleSkill[] {
  return couple.skills
    .map(({ skill: skillId, requiredCoupleLevel }) => {
      const raw = requireRawSkill(lookup, skillId, 'Couple skills');
      const level = maxLevelOf(raw);
      const abilities = normalizeAbilities(level.abilities);

      if (abilities.length === 0) {
        throw new ProjectionError(`Couple skill ${skillId} (${raw.name.en}) has no abilities`);
      }

      const skill: CoupleSkill = {
        id: raw.id,
        name: raw.name.en,
        icon: raw.icon,
        coupleLevel: requiredCoupleLevel,
        abilities,
      };

      if (level.duration !== undefined) {
        skill.durationSeconds = level.duration;
      }

      return skill;
    })
    .sort((a, b) => a.coupleLevel - b.coupleLevel || a.id - b.id);
}
