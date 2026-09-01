import type { GameData, SlimItem } from '@/data';

import type { ShieldEntry } from '../../build/schema';
import { piercingSlots } from '../../rules';
import {
  collectStacks,
  createSink,
  statAwakeContributions,
  type Collected,
} from '../abilities/collect';
import { memoizeByDataAndEntry } from './entryMemo';
import { collectItemAbilities, collectSkillAwake, itemLabel, resolveItemId } from './itemSlot';

export interface ShieldResolution extends Collected {
  readonly item: SlimItem | null;
  readonly upgrade: number;
}

/** A shield is a weapon minus random stats and jewels; it always sits in the offhand. */
function collectShield(data: GameData, entry: ShieldEntry): ShieldResolution {
  const sink = createSink();
  const item = resolveItemId(data, sink, entry.itemId, 'Shield');

  if (item !== null) {
    collectItemAbilities(sink, item, 'offhand', []);
    collectSkillAwake(sink, item, entry.skillAwake, 'offhand');
    collectStacks(data, sink, entry.cards, piercingSlots(item), {
      kind: 'offhand',
      detail: 'piercing',
      holder: itemLabel(item, entry.upgrade),
    });
    sink.contributions.push(...statAwakeContributions(entry.statAwake, 'offhand', item));
  }

  return {
    item,
    upgrade: entry.upgrade,
    contributions: sink.contributions,
    issues: sink.issues,
  };
}

export const resolveShieldEntry = memoizeByDataAndEntry(collectShield);
