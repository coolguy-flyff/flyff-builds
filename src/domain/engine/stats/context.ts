import type { GameData, SlimClass, StatKey } from '@/data';

import { getBaseStat, getStatTotal } from '../abilities/totals';
import type { EquippedItem, ResolvedCharacter, ResolvedOffhand } from '../types';

/**
 * The inputs every derivation reads: level, job factors, base stats (`getBaseStat`), stat totals
 * (`getStat`), the hands, the armor pieces and the Upcut flag. Formulas depend on this small
 * interface rather than on the resolved character so tests can pin them with synthetic contexts.
 */
export interface StatContext {
  readonly data: GameData;
  readonly level: number;
  readonly job: SlimClass;
  readonly base: (stat: StatKey) => number;
  readonly total: (parameter: string, rate: boolean) => number;
  readonly mainhand: EquippedItem;
  /** The shield or second weapon actually worn (the left-hand hit and `part` scalings read it). */
  readonly offhand: ResolvedOffhand | null;
  readonly armorPieces: readonly EquippedItem[];
  readonly hasUpcutStone: boolean;
}

export function createStatContext(data: GameData, resolved: ResolvedCharacter): StatContext {
  return {
    data,
    level: resolved.level,
    job: resolved.job,
    base: (stat) => getBaseStat(resolved, stat),
    total: (parameter, rate) => getStatTotal(resolved, parameter, rate),
    mainhand: { item: resolved.mainhand, upgrade: resolved.mainhandUpgrade },
    offhand: resolved.offhand,
    armorPieces: resolved.armorPieces,
    hasUpcutStone: resolved.hasUpcutStone,
  };
}
