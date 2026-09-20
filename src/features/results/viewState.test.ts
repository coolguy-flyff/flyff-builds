import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild, createGearSwap, createPetEntry } from '@/domain/build';

import { effectiveBaseline, setMembership, toggleMembership, withPetOverride } from './viewState';

describe('withPetOverride', () => {
  const data = loadBundledGameData();
  const base = createDefaultBuild(data);
  const pet = createPetEntry(7, 9941, 75);
  const build = {
    ...base,
    pets: [pet],
    gearSwaps: [...base.gearSwaps, { ...createGearSwap(8, 1), petId: 3 }],
  };

  it('puts the override pet, or no pet, on every swap', () => {
    const effective = withPetOverride(build, 7);

    expect(effective.gearSwaps.map((swap) => swap.petId)).toEqual([7, 7]);
    expect(effective.pets).toBe(build.pets);
    expect(withPetOverride(build, 'none').gearSwaps.map((swap) => swap.petId)).toEqual([
      null,
      null,
    ]);
  });

  it('returns the build itself without an override or for a pet that is gone', () => {
    expect(withPetOverride(build, 'own')).toBe(build);
    expect(withPetOverride(build, 99)).toBe(build);
  });
});

describe('setMembership / toggleMembership', () => {
  it('adds once, removes, and toggles', () => {
    expect(setMembership([1, 2], 3, true)).toEqual([1, 2, 3]);
    expect(setMembership([1, 2, 3], 3, true)).toEqual([1, 2, 3]);
    expect(setMembership([1, 2, 3], 2, false)).toEqual([1, 3]);
    expect(toggleMembership(['base'], 'base')).toEqual([]);
    expect(toggleMembership(['base'], 'raw')).toEqual(['base', 'raw']);
  });
});

describe('effectiveBaseline', () => {
  it('only keeps a baseline whose column is visible', () => {
    expect(effectiveBaseline(null, [1, 2])).toBeNull();
    expect(effectiveBaseline(2, [1, 2])).toBe(2);
    expect(effectiveBaseline(3, [1, 2])).toBeNull();
  });
});
