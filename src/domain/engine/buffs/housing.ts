import type { GameData, HousingNpc } from '@/data';
import { memoByRef } from '@/lib/memo';

import type { BuffsState } from '../../build/schema';
import { abilityContributions, origin, type Sink } from '../abilities/collect';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';

const personalNpcsById = memoByRef(
  (data: GameData) => new Map(data.personalNpcs.map((npc) => [npc.id, npc])),
);
const guildNpcsById = memoByRef(
  (data: GameData) => new Map(data.guildNpcs.map((npc) => [npc.id, npc])),
);

interface HousingGroup {
  readonly label: string;
  readonly ids: readonly number[];
  readonly npcs: ReadonlyMap<number, HousingNpc>;
}

/**
 * Personal and couple houses draw from the same NPC list; the guild ship has its own
 * (flyffentity.js:1457-1497).
 */
export function collectHousingNpcs(data: GameData, buffs: BuffsState, sink: Sink): void {
  const groups: readonly HousingGroup[] = [
    { label: 'personal house', ids: buffs.personalNpcIds, npcs: personalNpcsById(data) },
    { label: 'couple house', ids: buffs.coupleNpcIds, npcs: personalNpcsById(data) },
    { label: 'guild ship', ids: buffs.guildNpcIds, npcs: guildNpcsById(data) },
  ];

  for (const group of groups) {
    for (const npcId of group.ids) {
      const npc = group.npcs.get(npcId);

      if (npc === undefined) {
        sink.issues.push(
          engineWarning(
            ENGINE_ISSUE_CODES.unknownNpc,
            `Housing NPC #${npcId} (${group.label}) is not in the game data; ignored`,
          ),
        );

        continue;
      }

      sink.contributions.push(
        ...abilityContributions(
          npc.abilities,
          origin('housingNpc', `${npc.shortName} (${group.label})`),
        ),
      );
    }
  }
}
