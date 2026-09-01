import { requireItem, type AccessorySet, type GameData } from '@/data';
import { requireDefined } from '@/lib/assert';

import type { AccessorySetEntry } from '../../build/schema';
import { abilityContributions, createSink, origin, type Collected } from '../abilities/collect';
import type { ContributionOriginKind } from '../abilities/types';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';
import { memoizeByDataAndEntry } from './entryMemo';
import { collectSetBonus } from './setBonus';

export interface AccessorySetResolution extends Collected {
  readonly set: AccessorySet | null;
}

interface AccessoryPiece {
  readonly kind: ContributionOriginKind;
  readonly itemId: number | undefined;
  readonly upgrade: number;
}

/** Flyffulator's jewelry slot order (flyffentity.js:18-22). */
function accessoryPieces(set: AccessorySet, entry: AccessorySetEntry): AccessoryPiece[] {
  return [
    { kind: 'ring1', itemId: set.ring, upgrade: entry.upgrades.ring1 },
    { kind: 'earring1', itemId: set.earrings[entry.earring1], upgrade: entry.upgrades.earring1 },
    { kind: 'necklace', itemId: set.necklaces[entry.necklace], upgrade: entry.upgrades.necklace },
    { kind: 'earring2', itemId: set.earrings[entry.earring2], upgrade: entry.upgrades.earring2 },
    { kind: 'ring2', itemId: set.ring, upgrade: entry.upgrades.ring2 },
  ];
}

/**
 * Accessories read their abilities from `upgradeLevels[upgrade]` (flyffentity.js:1224-1236); the
 * set bonus counts every piece that resolved.
 */
function collectAccessorySet(data: GameData, entry: AccessorySetEntry): AccessorySetResolution {
  const sink = createSink();
  let set: AccessorySet | null = null;

  if (entry.setId !== null) {
    set = data.accessorySets.find((candidate) => candidate.id === entry.setId) ?? null;

    if (set === null) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.unknownItem,
          `Accessory set #${entry.setId} is not in the game data; the slot counts as empty`,
        ),
      );
    }
  }

  if (set !== null) {
    let equipped = 0;

    for (const piece of accessoryPieces(set, entry)) {
      if (piece.itemId === undefined) {
        sink.issues.push(
          engineWarning(
            ENGINE_ISSUE_CODES.accessoryVariantUnavailable,
            `${set.name}: no ${entry.necklace} necklace exists in this set; the slot counts as empty`,
          ),
        );

        continue;
      }

      const item = requireItem(data, piece.itemId);
      const level = requireDefined(
        item.upgradeLevels?.[piece.upgrade],
        `${item.name} has no upgrade level ${piece.upgrade}`,
      );

      equipped += 1;
      sink.contributions.push(
        ...abilityContributions(
          level.abilities,
          origin(piece.kind, `${item.name} +${piece.upgrade}`, {
            detail: 'upgradeLevel',
            itemId: item.id,
          }),
        ),
      );
    }

    collectSetBonus(sink, set.name, set.bonus, equipped, 'accessorySetBonus');
  }

  return { set, contributions: sink.contributions, issues: sink.issues };
}

export const resolveAccessorySetEntry = memoizeByDataAndEntry(collectAccessorySet);
