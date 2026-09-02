import { formatStatValue } from '@/domain/build';
import { expandTargetStats, type SwapResult } from '@/domain/engine';

import { formatInt } from './format';
import type { CellDetail, ResultsRow, SourceSpec } from './rowCatalog';

/**
 * The tooltip lines for one results cell: either the row's precomputed factors (max HP/MP/FP) or
 * the sources behind its stat totals — every contribution that `getStat` would count, summed per
 * origin and sorted by magnitude — plus the stat page for base stats. Empty when there is nothing
 * to show.
 */

interface SourceSum {
  readonly label: string;
  readonly rate: boolean;
  add: number;
}

function sourceLines(result: SwapResult, specs: readonly SourceSpec[]): CellDetail[] {
  const lines: CellDetail[] = [];
  const sums = new Map<string, SourceSum>();

  for (const spec of specs) {
    if (spec.statPageKey !== undefined) {
      lines.push({
        label: 'Stat page',
        value: formatInt(result.resolved.statPage[spec.statPageKey]),
      });
    }

    const targets = new Set(expandTargetStats(spec.parameter));

    for (const contribution of result.resolved.contributions) {
      const parameterMatches =
        contribution.match === 'exact'
          ? contribution.parameter === spec.parameter
          : targets.has(contribution.parameter);

      if (contribution.rate !== spec.rate || !parameterMatches) {
        continue;
      }

      const key = `${contribution.origin.label}:${String(contribution.rate)}`;
      const sum = sums.get(key);

      if (sum === undefined) {
        sums.set(key, {
          label: contribution.origin.label,
          rate: contribution.rate,
          add: contribution.add,
        });
      } else {
        sum.add += contribution.add;
      }
    }
  }

  const sorted = [...sums.values()]
    .filter((sum) => sum.add !== 0)
    .sort((a, b) => Math.abs(b.add) - Math.abs(a.add));

  for (const sum of sorted) {
    lines.push({ label: sum.label, value: formatStatValue(sum.add, sum.rate) });
  }

  return lines;
}

export function cellDetails(row: ResultsRow, result: SwapResult): readonly CellDetail[] {
  let lines: readonly CellDetail[] = [];

  if (row.details !== undefined) {
    lines = row.details(result.page);
  } else if (row.sources !== undefined) {
    lines = sourceLines(result, row.sources);
  }

  return lines;
}
