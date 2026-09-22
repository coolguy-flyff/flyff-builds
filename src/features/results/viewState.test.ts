import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild, createGearSwap, createPetEntry } from '@/domain/build';

import {
  effectiveBaseline,
  graceEffectFor,
  setMembership,
  toggleMembership,
  withPetOverride,
  type OverridePet,
} from './viewState';

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

describe('graceEffectFor', () => {
  const pet = (id: number, graceEffect: string | null): OverridePet => ({
    id,
    name: `Pet ${id}`,
    icon: null,
    stat: null,
    graceEffect,
  });
  const pets = [pet(1, 'STR +10'), pet(2, null)];

  it('varies while each swap keeps its own pet, or the override names a deleted pet', () => {
    expect(graceEffectFor('own', pets)).toEqual({ kind: 'varies' });
    expect(graceEffectFor(99, pets)).toEqual({ kind: 'varies' });
  });

  it('is none without a pet or for a pet that has no grace', () => {
    expect(graceEffectFor('none', pets)).toEqual({ kind: 'none' });
    expect(graceEffectFor(2, pets)).toEqual({ kind: 'none' });
  });

  it("is the chosen pet's grace otherwise", () => {
    expect(graceEffectFor(1, pets)).toEqual({ kind: 'effect', text: 'STR +10' });
  });
});
