import type { GameData } from '@/data';

import { isClassSkillUnlocked } from '../../rules/usability';
import type { Sink } from '../abilities/collect';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';
import { maxedSkillContributions } from './maxedSkill';

/**
 * The active class buffs, self-buffs and passives, each maxed (plan feedback 2026-09-03, item 1).
 * `validateBuild` keeps the list to the job's own skills; an id the data no longer knows is
 * reported and skipped rather than trusted. A skill the character's level cannot learn yet stays
 * in the list (so raising the level brings it back) but is reported and skipped.
 */
export function collectClassSkills(
  data: GameData,
  skillIds: readonly number[],
  level: number,
  sink: Sink,
): void {
  for (const skillId of skillIds) {
    const skill = data.classSkills.get(skillId);

    if (skill === undefined) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.unknownSkill,
          `Class skill #${skillId} is not in the game data and was ignored`,
        ),
      );

      continue;
    }

    if (!isClassSkillUnlocked(skill, level)) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.skillLocked,
          `${skill.name} needs Lv ${skill.level} (character is Lv ${level}) and was skipped`,
        ),
      );

      continue;
    }

    sink.contributions.push(...maxedSkillContributions(skill, 'classSkill'));
  }
}
