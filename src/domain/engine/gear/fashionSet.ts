import { getStatName, type GameData } from '@/data';

import type { FashionSetEntry } from '../../build/schema';
import { contribution, createSink, origin, type Collected } from '../abilities/collect';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';
import { memoizeByDataAndEntry } from './entryMemo';
import { collectItemAbilities, resolveItemId } from './itemSlot';

/**
 * A fashion set is modelled as an aggregate: the suit + shoes speed as one rate line, each
 * blessing line as one contribution (rate from Blessings.json), plus the cloak's abilities.
 */
function collectFashionSet(data: GameData, entry: FashionSetEntry): Collected {
  const sink = createSink();

  if (entry.speedPercent !== 0) {
    sink.contributions.push(
      contribution('speed', entry.speedPercent, true, origin('fashion', 'Fashion set speed')),
    );
  }

  for (const line of entry.blessings) {
    const blessing = data.blessings[line.parameter];

    if (blessing === undefined) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.unknownBlessing,
          `Blessing "${line.parameter}" is not in the game data; ignored`,
        ),
      );

      continue;
    }

    if (line.total !== 0) {
      sink.contributions.push(
        contribution(
          line.parameter,
          line.total,
          blessing.rate,
          origin('blessing', `Blessing: ${getStatName(data, line.parameter)}`),
        ),
      );
    }
  }

  const cloak = resolveItemId(data, sink, entry.cloakItemId, 'Cloak');

  if (cloak !== null) {
    collectItemAbilities(sink, cloak, 'cloak', []);
  }

  return { contributions: sink.contributions, issues: sink.issues };
}

export const resolveFashionSetEntry = memoizeByDataAndEntry(collectFashionSet);
