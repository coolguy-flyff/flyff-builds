import type { GameData, SlimItem } from '@/data';
import { memoByRef, memoByRefAndKey } from '@/lib/memo';

import type { WeaponEntry } from '../../build/schema';
import { piercingSlots, ultimateJewelSlots } from '../../rules';
import {
  collectStacks,
  createSink,
  statAwakeContributions,
  type Collected,
} from '../abilities/collect';
import {
  collectItemAbilities,
  collectRandomStats,
  collectSkillAwake,
  itemLabel,
  resolveItemId,
} from './itemSlot';

export type WeaponHand = 'mainhand' | 'offhand';

export interface WeaponResolution extends Collected {
  /** `null` when the entry has no item (bare hands) or references an unknown item. */
  readonly item: SlimItem | null;
  readonly upgrade: number;
}

/**
 * Everything a weapon entry contributes: abilities (with chosen stat ranges), ultimate random
 * stats, skill awake, piercing cards, ultimate jewels (capped by slots —
 * FLYFFULATOR_QUIRKS.jewelsSlicedByUpgrade) and stat-awake lines.
 */
function collectWeapon(data: GameData, entry: WeaponEntry, hand: WeaponHand): WeaponResolution {
  const sink = createSink();
  const item = resolveItemId(data, sink, entry.itemId, 'Weapon');

  if (item !== null) {
    const holder = itemLabel(item, entry.upgrade);

    collectItemAbilities(sink, item, hand, entry.statRanges);
    collectRandomStats(sink, item, entry.upgrade, entry.randomStats, hand);
    collectSkillAwake(sink, item, entry.skillAwake, hand);
    collectStacks(data, sink, entry.cards, piercingSlots(item), {
      kind: hand,
      detail: 'piercing',
      holder,
    });
    collectStacks(data, sink, entry.jewels, ultimateJewelSlots(item, entry.upgrade), {
      kind: hand,
      detail: 'jewel',
      holder,
    });
    sink.contributions.push(...statAwakeContributions(entry.statAwake, hand, item));
  }

  return {
    item,
    upgrade: entry.upgrade,
    contributions: sink.contributions,
    issues: sink.issues,
  };
}

const memo = memoByRef((data: GameData) =>
  memoByRefAndKey((entry: WeaponEntry, hand: WeaponHand) => collectWeapon(data, entry, hand)),
);

export function resolveWeaponEntry(
  data: GameData,
  entry: WeaponEntry,
  hand: WeaponHand,
): WeaponResolution {
  return memo(data)(entry, hand);
}
