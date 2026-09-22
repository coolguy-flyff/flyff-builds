import type { GameData } from '@/data';
import { memoByRef } from '@/lib/memo';

import { abilityContributions, origin, type Sink } from '../abilities/collect';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';

const coupleSkillsById = memoByRef(
  (data: GameData) => new Map(data.coupleSkills.map((skill) => [skill.id, skill])),
);

/** The couple's buffs: single-level skills whose abilities apply as listed. */
export function collectCoupleSkills(data: GameData, skillIds: readonly number[], sink: Sink): void {
  const byId = coupleSkillsById(data);

  for (const skillId of skillIds) {
    const skill = byId.get(skillId);

    if (skill === undefined) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.unknownSkill,
          `Couple skill #${skillId} is not in the game data; ignored`,
        ),
      );

      continue;
    }

    sink.contributions.push(
      ...abilityContributions(skill.abilities, origin('coupleSkill', skill.name)),
    );
  }
}
