import type { SetBonus } from '@/data';

import { contribution, origin, type Sink } from '../abilities/collect';
import type { ContributionOriginKind } from '../abilities/types';

/**
 * Set bonuses apply once their `equipped` threshold is reached; lower tiers stack with higher ones
 * (flyffentity.js:1300-1326).
 */
export function collectSetBonus(
  sink: Sink,
  setName: string,
  bonus: readonly SetBonus[],
  equipped: number,
  kind: ContributionOriginKind,
): void {
  for (const line of bonus) {
    if (line.equipped > equipped) {
      continue;
    }

    sink.contributions.push(
      contribution(
        line.ability.parameter,
        line.ability.add,
        line.ability.rate,
        origin(kind, `${setName} (${line.equipped} pieces)`),
      ),
    );
  }
}
