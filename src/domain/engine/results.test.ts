import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';

import { createGearSwap } from '../build/defaults';
import { computeAllResults } from './results';
import { createTestBuild, firstStatPage, firstSwap } from './testing/builders';

const data = loadBundledGameData();

describe('computeAllResults', () => {
  it('returns one column per included swap, in swap order', () => {
    const build = createTestBuild(data);
    const page = firstStatPage(build);
    const hidden = createGearSwap(50, page.id);
    const second = createGearSwap(51, page.id);

    hidden.includeInResults = false;
    build.gearSwaps.push(hidden, second);

    const results = computeAllResults(data, build);

    expect(results.map((result) => result.swapId)).toEqual([firstSwap(build).id, 51]);
    expect(results[0]?.page.hp).toBe(results[1]?.page.hp);
    expect(results[0]?.resolved.issues).toEqual([]);
  });
});
