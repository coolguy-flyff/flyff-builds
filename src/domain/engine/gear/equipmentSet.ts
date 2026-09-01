import { ARMOR_PARTS, requireItem, type ArmorSet, type GameData } from '@/data';

import type { EquipmentSetEntry } from '../../build/schema';
import { piercingSlots, upgradeBonusRow } from '../../rules';
import {
  abilityContributions,
  collectStacks,
  createSink,
  origin,
  setStatAwakeContributions,
  type Collected,
  type Sink,
} from '../abilities/collect';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';
import type { EquippedItem } from '../types';
import { memoizeByDataAndEntry } from './entryMemo';
import { collectItemAbilities, itemLabel } from './itemSlot';
import { collectSetBonus } from './setBonus';

export interface EquipmentSetResolution extends Collected {
  readonly set: ArmorSet | null;
  /** Helmet, suit, gauntlets, boots — all at the entry's upgrade. */
  readonly pieces: readonly EquippedItem[];
  readonly upgrade: number;
}

/** The armor-set upgrade bonus uses the raw common upgrade (FLYFFULATOR_QUIRKS.rawArmorSetUpgrade). */
function collectArmorSetUpgrade(data: GameData, sink: Sink, set: ArmorSet, upgrade: number): void {
  const row = upgrade > 0 ? upgradeBonusRow(data, upgrade) : undefined;

  if (row !== undefined) {
    sink.contributions.push(
      ...abilityContributions(
        row.setAbilities,
        origin('armorSetUpgrade', `${set.name} +${upgrade}`, { detail: 'upgradeLevel' }),
      ),
    );
  }
}

/**
 * The four pieces (abilities, both stat-awake lines each, suit cards), then the armor-set upgrade
 * bonus and the set bonus lines reachable with all four pieces worn.
 */
function collectEquipmentSet(data: GameData, entry: EquipmentSetEntry): EquipmentSetResolution {
  const sink = createSink();
  const pieces: EquippedItem[] = [];
  let set: ArmorSet | null = null;

  if (entry.setId !== null) {
    set = data.armorSets.get(entry.setId) ?? null;

    if (set === null) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.unknownItem,
          `Armor set #${entry.setId} is not in the game data; the slot counts as empty`,
        ),
      );
    }
  }

  if (set !== null) {
    for (const part of ARMOR_PARTS) {
      const item = requireItem(data, set.parts[part]);

      pieces.push({ item, upgrade: entry.upgrade });
      collectItemAbilities(sink, item, part, []);

      if (part === 'suit') {
        collectStacks(data, sink, entry.suitCards, piercingSlots(item), {
          kind: part,
          detail: 'piercing',
          holder: itemLabel(item, entry.upgrade),
        });
      }
    }

    sink.contributions.push(...setStatAwakeContributions(entry.statAwake, set.name));
    collectArmorSetUpgrade(data, sink, set, entry.upgrade);
    collectSetBonus(sink, set.name, set.bonus, pieces.length, 'armorSetBonus');
  }

  return {
    set,
    pieces,
    upgrade: entry.upgrade,
    contributions: sink.contributions,
    issues: sink.issues,
  };
}

export const resolveEquipmentSetEntry = memoizeByDataAndEntry(collectEquipmentSet);
