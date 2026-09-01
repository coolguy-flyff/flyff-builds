import type { GameData } from '@/data';
import { memoByRef } from '@/lib/memo';

import type { BuffsState } from '../../build/schema';
import { createSink, type Collected } from '../abilities/collect';
import { collectAchievement } from './achievements';
import { collectHousingNpcs } from './housing';
import { collectPremiumItems } from './premiumItems';
import { rmBuffContributions } from './rmBuffs';

export interface BuffsResolution extends Collected {
  readonly hasUpcutStone: boolean;
}

/**
 * The global buff configuration shared by every swap, in Flyffulator's aggregation order: active
 * items, buffs, housing NPCs, achievements (flyffentity.js:1328-1512).
 */
function collectBuffs(data: GameData, buffs: BuffsState): BuffsResolution {
  const sink = createSink();
  const hasUpcutStone = collectPremiumItems(data, buffs.premiumItemIds, sink);

  sink.contributions.push(...rmBuffContributions(data, buffs.rmBuffs));
  collectHousingNpcs(data, buffs, sink);
  collectAchievement(data, buffs.achievementId, sink);

  return { hasUpcutStone, contributions: sink.contributions, issues: sink.issues };
}

const memo = memoByRef((data: GameData) =>
  memoByRef((buffs: BuffsState) => collectBuffs(data, buffs)),
);

export function resolveBuffs(data: GameData, buffs: BuffsState): BuffsResolution {
  return memo(data)(buffs);
}

export { maxBuffContributions, rmBuffContributions } from './rmBuffs';
