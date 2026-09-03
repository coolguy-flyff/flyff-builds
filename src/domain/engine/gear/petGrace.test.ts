import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';

import { DEFAULT_ENGINE_OPTIONS } from '../options';
import { resolveGearSwap } from '../resolve';
import { computeResultsPage } from '../stats/resultsPage';
import { addPet, createTestBuild, firstSwap } from '../testing/builders';
import { resolvePetGrace } from './petGrace';

const data = loadBundledGameData();
const LION_PET = 9941;
const WITH_GRACE = { ...DEFAULT_ENGINE_OPTIONS, petGrace: true };

describe('resolvePetGrace', () => {
  it("casts the grace at the level the pet's raised tiers unlock", () => {
    // A perfect Lion (75) raised every tier F..S → grace level 7: Max HP +50%.
    expect(resolvePetGrace(data, { id: 1, petItemId: LION_PET, total: 75 })).toMatchObject({
      grace: { name: "Lion's Grace", level: 7 },
      contributions: [expect.objectContaining({ parameter: 'maxhp', add: 50, rate: true })],
    });
    // A total reachable with tier F alone stays at grace level 1.
    expect(resolvePetGrace(data, { id: 2, petItemId: LION_PET, total: 1 })).toMatchObject({
      grace: { level: 1 },
      contributions: [expect.objectContaining({ parameter: 'maxhp', add: 4 })],
    });
    expect(resolvePetGrace(data, { id: 3, petItemId: null, total: 0 }).grace).toBeNull();
  });
});

describe('the pet grace option', () => {
  it('adds the grace only when switched on and reports it on the resolved swap', () => {
    const build = createTestBuild(data, { stats: { sta: 400 } });

    addPet(build, LION_PET, 75);

    const swap = firstSwap(build);
    const plain = resolveGearSwap(data, build, swap);
    const graced = resolveGearSwap(data, build, swap, WITH_GRACE);

    expect(plain.petGrace).toBeNull();
    expect(graced.petGrace).toMatchObject({ name: "Lion's Grace", level: 7 });
    expect(computeResultsPage(data, graced).hp).toBeGreaterThan(computeResultsPage(data, plain).hp);
  });
});
