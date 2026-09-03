import { requireItem, type AccessorySet, type GameData } from '@/data';

import { ACCESSORY_PIECE_KEYS, type AccessorySetEntry } from '../../build/schema';
import {
  accessoryPieceAbilities,
  accessoryPieceItemId,
  accessoryPieceSource,
  findAccessorySet,
} from '../../rules/accessories';
import {
  abilityContributions,
  createSink,
  origin,
  type Collected,
  type Sink,
} from '../abilities/collect';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';
import { memoizeByDataAndEntry } from './entryMemo';
import { collectSetBonus } from './setBonus';

export interface AccessorySetResolution extends Collected {
  readonly set: AccessorySet | null;
}

function warnUnknownSource(sink: Sink, sourceId: number, where: string): void {
  sink.issues.push(
    engineWarning(
      ENGINE_ISSUE_CODES.unknownItem,
      `Accessory source #${sourceId} is not a set or CW jewel this piece can wear; ${where} counts as empty`,
    ),
  );
}

/**
 * Set pieces read their abilities from `upgradeLevels[upgrade]` (flyffentity.js:1224-1236); a CW
 * jewel's tier is its own item. Each piece follows its own source (mixed sets, plan feedback
 * 2026-09-03), and every set's bonus counts the pieces worn from it — the game discovers sets per
 * equipped item (flyffentity.js:1918-1937). CW jewels belong to no set.
 */
function collectAccessorySet(data: GameData, entry: AccessorySetEntry): AccessorySetResolution {
  const sink = createSink();
  const set = findAccessorySet(data, entry.setId);
  const equippedPerSet = new Map<AccessorySet, number>();

  if (entry.setId !== null && set === null) {
    warnUnknownSource(sink, entry.setId, 'the slot');
  }

  // Pieces in Flyffulator's jewelry slot order (flyffentity.js:18-22).
  for (const piece of ACCESSORY_PIECE_KEYS) {
    const source = accessoryPieceSource(data, entry, piece);
    const overrideId = entry.pieceSources[piece];

    if (source === null) {
      if (overrideId !== null) {
        warnUnknownSource(sink, overrideId, `the ${piece} slot`);
      }

      continue;
    }

    const itemId = accessoryPieceItemId(data, entry, piece);

    if (itemId === undefined) {
      const sourceName = source.kind === 'set' ? source.set.name : source.line.name;

      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.accessoryVariantUnavailable,
          `${sourceName}: no ${entry.necklace} necklace exists in this set; the slot counts as empty`,
        ),
      );

      continue;
    }

    const item = requireItem(data, itemId);
    const upgrade = entry.upgrades[piece];
    const abilities = accessoryPieceAbilities(source, item, upgrade);

    if (source.kind === 'set') {
      equippedPerSet.set(source.set, (equippedPerSet.get(source.set) ?? 0) + 1);
    }

    // A CW jewel's item name already carries its tier ("Speedo +3").
    const label = source.kind === 'set' ? `${item.name} +${upgrade}` : item.name;
    const detail = source.kind === 'set' ? 'upgradeLevel' : 'ability';

    sink.contributions.push(
      ...abilityContributions(abilities, origin(piece, label, { detail, itemId: item.id })),
    );
  }

  for (const [wornSet, equipped] of equippedPerSet) {
    collectSetBonus(sink, wornSet.name, wornSet.bonus, equipped, 'accessorySetBonus');
  }

  return { set, contributions: sink.contributions, issues: sink.issues };
}

export const resolveAccessorySetEntry = memoizeByDataAndEntry(collectAccessorySet);
