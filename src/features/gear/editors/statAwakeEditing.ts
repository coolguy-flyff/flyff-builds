import type { GameData, StatKey } from '@/data';
import type { StatAwake, StatAwakeLine } from '@/domain/build';
import { statAwakeCombos, statAwakePartnerOptions, statAwakeValueOptions } from '@/domain/rules';

import { nearestValue } from '../values';

/** Which line the user just edited; its value is kept whenever the table allows it. */
export type AwakePriority = 'first' | 'second';

interface ValuePair {
  readonly first: number;
  readonly second: number;
}

/** Value pairs StatAwakes.json allows for the ordered stat pair (either table orientation). */
function pairsFor(data: GameData, firstStat: StatKey, secondStat: StatKey): ValuePair[] {
  const pairs: ValuePair[] = [];

  for (const combo of statAwakeCombos(data)) {
    if (combo.second === null) {
      continue;
    }

    if (combo.first.stat === firstStat && combo.second.stat === secondStat) {
      pairs.push({ first: combo.first.value, second: combo.second.value });
    } else if (combo.first.stat === secondStat && combo.second.stat === firstStat) {
      pairs.push({ first: combo.second.value, second: combo.first.value });
    }
  }

  return pairs;
}

const PRIORITY_WEIGHT = 100;

function closestPair(
  pairs: readonly ValuePair[],
  first: number,
  second: number,
  priority: AwakePriority,
): ValuePair | undefined {
  let best: ValuePair | undefined;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const pair of pairs) {
    const firstDistance = Math.abs(pair.first - first);
    const secondDistance = Math.abs(pair.second - second);
    const score =
      priority === 'first'
        ? firstDistance * PRIORITY_WEIGHT + secondDistance
        : secondDistance * PRIORITY_WEIGHT + firstDistance;

    if (score < bestScore) {
      best = pair;
      bestScore = score;
    }
  }

  return best;
}

/**
 * Snaps a requested awake to the nearest entry of the awake table so the stored awake is always
 * valid: an empty first line clears both, a partner the table doesn't pair is dropped, and value
 * pairs snap to the closest allowed pair while preferring to keep the `priority` line's value.
 */
export function normalizeStatAwake(
  data: GameData,
  first: StatAwakeLine | null,
  second: StatAwakeLine | null,
  priority: AwakePriority = 'first',
): StatAwake {
  let awake: StatAwake = [null, null];

  if (first !== null) {
    const partner =
      second !== null && statAwakePartnerOptions(data, first.stat).includes(second.stat)
        ? second
        : null;

    if (partner === null) {
      const value = nearestValue(statAwakeValueOptions(data, first.stat, null), first.value);

      if (value !== undefined) {
        awake = [{ stat: first.stat, value }, null];
      }
    } else {
      const pair = closestPair(
        pairsFor(data, first.stat, partner.stat),
        first.value,
        partner.value,
        priority,
      );

      if (pair !== undefined) {
        awake = [
          { stat: first.stat, value: pair.first },
          { stat: partner.stat, value: pair.second },
        ];
      }
    }
  }

  return awake;
}
