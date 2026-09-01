import type { GameData } from '@/data';

import type { PetEntry } from '../../build/schema';
import { contribution, createSink, origin, type Collected } from '../abilities/collect';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';
import { memoizeByDataAndEntry } from './entryMemo';

/** A raised pet is one line: its stat, the chosen total, the rate from Pets.json (flyffentity.js:1441-1455). */
function collectPet(data: GameData, entry: PetEntry): Collected {
  const sink = createSink();

  if (entry.petItemId !== null) {
    const petItemId = entry.petItemId;
    const def = data.pets.find((candidate) => candidate.petItemId === petItemId);

    if (def === undefined) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.unknownItem,
          `Pet #${petItemId} is not in the game data; the slot counts as empty`,
        ),
      );
    } else {
      sink.contributions.push(
        contribution(
          def.parameter,
          entry.total,
          def.rate,
          origin('pet', def.name, { itemId: def.petItemId }),
        ),
      );
    }
  }

  return { contributions: sink.contributions, issues: sink.issues };
}

export const resolvePetEntry = memoizeByDataAndEntry(collectPet);
