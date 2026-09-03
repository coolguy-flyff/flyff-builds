import type { GameData } from '@/data';

import type { BuildState } from '../build/schema';
import { DEFAULT_ENGINE_OPTIONS, type EngineOptions } from './options';
import { resolveGearSwap } from './resolve';
import { computeResultsPage, type ResultsPage } from './stats/resultsPage';
import type { ResolvedCharacter } from './types';

export interface SwapResult {
  readonly swapId: number;
  readonly resolved: ResolvedCharacter;
  readonly page: ResultsPage;
}

/** One column per swap included in the results, in swap order. */
export function computeAllResults(
  data: GameData,
  build: BuildState,
  options: EngineOptions = DEFAULT_ENGINE_OPTIONS,
): readonly SwapResult[] {
  const results: SwapResult[] = [];

  for (const swap of build.gearSwaps) {
    if (!swap.includeInResults) {
      continue;
    }

    const resolved = resolveGearSwap(data, build, swap, options);

    results.push({ swapId: swap.id, resolved, page: computeResultsPage(data, resolved, options) });
  }

  return results;
}
