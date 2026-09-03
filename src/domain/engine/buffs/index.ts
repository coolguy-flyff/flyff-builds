import type { GameData } from '@/data';
import { memoByRef, memoByRefAndKey } from '@/lib/memo';

import type { BuffsState } from '../../build/schema';
import { createSink, type Collected } from '../abilities/collect';
import { collectAchievement } from './achievements';
import { collectClassSkills } from './classSkills';
import { collectHousingNpcs } from './housing';
import { collectPremiumItems } from './premiumItems';
import { rmBuffContributions } from './rmBuffs';

export interface BuffsResolution extends Collected {
  readonly hasUpcutStone: boolean;
}

/**
 * The global buff configuration shared by every swap, in Flyffulator's aggregation order: active
 * items, buffs (RM buffs, then the character's own class skills), housing NPCs, achievements
 * (flyffentity.js:1328-1512).
 */
function collectBuffs(data: GameData, buffs: BuffsState, level: number): BuffsResolution {
  const sink = createSink();
  const hasUpcutStone = collectPremiumItems(data, buffs.premiumItemIds, sink);

  sink.contributions.push(...rmBuffContributions(data, buffs.rmBuffs));
  collectClassSkills(data, buffs.classSkillIds, level, sink);
  collectHousingNpcs(data, buffs, sink);
  collectAchievement(data, buffs.achievementId, sink);

  return { hasUpcutStone, contributions: sink.contributions, issues: sink.issues };
}

const memo = memoByRef((data: GameData) =>
  memoByRefAndKey((buffs: BuffsState, level: number) => collectBuffs(data, buffs, level)),
);

/** The buffs as they apply at the character's level (class skills above it are locked). */
export function resolveBuffs(data: GameData, buffs: BuffsState, level: number): BuffsResolution {
  return memo(data)(buffs, level);
}

export { maxedSkillContributions } from './maxedSkill';
export { rmBuffContributions } from './rmBuffs';
