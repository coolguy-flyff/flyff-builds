import { UPCUT_STONE_ITEM_ID, type GameData } from '@/data';

import { abilityContributions, origin, type Sink } from '../abilities/collect';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';

/**
 * Active consumables contribute their abilities (flyffentity.js:1330-1344). Upcut Stone has none:
 * its ×1.2 lives in the attack formula, so the resolver only records that it is active.
 * @returns whether an Upcut Stone is active.
 */
export function collectPremiumItems(data: GameData, ids: readonly number[], sink: Sink): boolean {
  let hasUpcutStone = false;

  for (const itemId of ids) {
    const item = data.items.get(itemId);

    if (item === undefined) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.unknownItem,
          `Premium item #${itemId} is not in the game data; ignored`,
        ),
      );

      continue;
    }

    if (item.id === UPCUT_STONE_ITEM_ID) {
      hasUpcutStone = true;
    }

    sink.contributions.push(
      ...abilityContributions(
        item.abilities ?? [],
        origin('premiumItem', item.name, { itemId: item.id }),
      ),
    );
  }

  return hasUpcutStone;
}
