import type { GameData } from '@/data';

import { abilityContributions, origin, type Sink } from '../abilities/collect';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';

/** FWC achievements (flyffentity.js:1499-1512; rate normalised by the data pipeline). */
export function collectAchievement(data: GameData, achievementId: number | null, sink: Sink): void {
  if (achievementId === null) {
    return;
  }

  const achievement = data.achievements.find((candidate) => candidate.id === achievementId);

  if (achievement === undefined) {
    sink.issues.push(
      engineWarning(
        ENGINE_ISSUE_CODES.unknownAchievement,
        `Achievement #${achievementId} is not in the game data; ignored`,
      ),
    );

    return;
  }

  sink.contributions.push(
    ...abilityContributions(achievement.abilities, origin('achievement', achievement.name)),
  );
}
