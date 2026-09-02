import { describe, expect, it } from 'vitest';

import type { Stack } from '@/domain/build';

import {
  addStackUnits,
  fillRemainingWithLast,
  firstUnusedOption,
  freeSlots,
  replaceSlot,
  setStackCount,
  slotContents,
  sortStackOptions,
  stackAbbreviation,
  stackFamily,
  stackUnits,
} from './stacks';

const LAND_A = 5666;
const FIRE_A = 2517;
const WATER_A = 8591;

function stacks(...pairs: readonly (readonly [number, number])[]): Stack[] {
  return pairs.map(([itemId, count]) => ({ itemId, count }));
}

describe('stack editing', () => {
  it('expands stacks into per-slot units in stack order', () => {
    expect(stackUnits(stacks([LAND_A, 2], [FIRE_A, 1]))).toEqual([LAND_A, LAND_A, FIRE_A]);
    expect(freeSlots(stacks([LAND_A, 2]), 5)).toBe(3);
    expect(freeSlots(stacks([LAND_A, 7]), 5)).toBe(0);
  });

  it('merges added units into an existing stack and removes stacks at count zero', () => {
    expect(addStackUnits(stacks([LAND_A, 2]), LAND_A, 3)).toEqual(stacks([LAND_A, 5]));
    expect(addStackUnits(stacks([LAND_A, 2]), FIRE_A, 1)).toEqual(stacks([LAND_A, 2], [FIRE_A, 1]));
    expect(setStackCount(stacks([LAND_A, 2], [FIRE_A, 1]), 1, 0)).toEqual(stacks([LAND_A, 2]));
    // Removing the stack between two halves of the same item merges them back together.
    expect(setStackCount(stacks([LAND_A, 2], [FIRE_A, 1], [LAND_A, 3]), 1, 0)).toEqual(
      stacks([LAND_A, 5]),
    );
  });

  it('fills the remaining capacity with the last stack', () => {
    expect(fillRemainingWithLast(stacks([LAND_A, 2], [FIRE_A, 1]), 5)).toEqual(
      stacks([LAND_A, 2], [FIRE_A, 3]),
    );
    expect(fillRemainingWithLast(stacks([LAND_A, 5]), 5)).toEqual(stacks([LAND_A, 5]));
    expect(fillRemainingWithLast([], 5)).toEqual([]);
  });

  it('pads slot contents to the capacity and extends them when over it', () => {
    expect(slotContents(stacks([LAND_A, 2]), 4)).toEqual([LAND_A, LAND_A, null, null]);
    expect(slotContents(stacks([LAND_A, 3]), 2)).toEqual([LAND_A, LAND_A, LAND_A]);
  });

  it('keeps a repointed slot in place, splitting the stack around it', () => {
    expect(replaceSlot(stacks([LAND_A, 2]), 1, FIRE_A)).toEqual(stacks([LAND_A, 1], [FIRE_A, 1]));
    expect(replaceSlot(stacks([LAND_A, 1]), 0, WATER_A)).toEqual(stacks([WATER_A, 1]));
    expect(replaceSlot(stacks([LAND_A, 1]), 3, FIRE_A)).toEqual(stacks([LAND_A, 1], [FIRE_A, 1]));
    expect(replaceSlot(stacks([LAND_A, 1]), 0, null)).toEqual([]);
    expect(replaceSlot(stacks([LAND_A, 2]), 0, LAND_A)).toEqual(stacks([LAND_A, 2]));
    // A full strip: the pick lands in the chosen slot, not at the end.
    expect(replaceSlot(stacks([LAND_A, 5]), 2, FIRE_A)).toEqual(
      stacks([LAND_A, 2], [FIRE_A, 1], [LAND_A, 2]),
    );
    expect(replaceSlot(stacks([LAND_A, 2], [FIRE_A, 1], [LAND_A, 2]), 2, LAND_A)).toEqual(
      stacks([LAND_A, 5]),
    );
    // Emptying a middle slot closes the gap.
    expect(replaceSlot(stacks([LAND_A, 1], [FIRE_A, 1], [WATER_A, 1]), 1, null)).toEqual(
      stacks([LAND_A, 1], [WATER_A, 1]),
    );
  });

  it('derives families and strip abbreviations from item names', () => {
    expect(stackFamily('Land Card (A)')).toBe('Land');
    expect(stackFamily('Volcano Card (7%)')).toBe('Volcano');
    expect(stackFamily('Shining Amethyst (10)')).toBe('Amethyst');
    expect(stackFamily('Rainbow Jewel (3)')).toBe('Rainbow');
    expect(stackFamily('Rune of Attack')).toBe('Runes');
    expect(stackAbbreviation('Land Card (A)')).toBe('LA');
    expect(stackAbbreviation('Volcano Card (7%)')).toBe('V7');
    expect(stackAbbreviation('Shining Amethyst (10)')).toBe('A10');
    expect(stackAbbreviation('Rune of Attack')).toBe('R');
  });

  it('sorts options by family and ascending strength and finds unused options', () => {
    const options = [
      { id: 1, name: 'Land Card (A)', abilities: [{ parameter: 'sta', add: 6, rate: false }] },
      { id: 2, name: 'Land Card (D)', abilities: [{ parameter: 'sta', add: 2, rate: false }] },
      { id: 3, name: 'Fire Card (D)', abilities: [{ parameter: 'str', add: 2, rate: false }] },
    ];
    const slim = options.map((option) => ({
      ...option,
      icon: 'x.png',
      level: 1,
      category: 'material',
      rarity: 'common' as const,
    }));

    expect(sortStackOptions(slim).map((option) => option.id)).toEqual([3, 2, 1]);
    // firstUnusedOption respects the caller's option order (here: Land A, Land D, Fire D).
    expect(firstUnusedOption(slim, stacks([3, 1]))?.id).toBe(1);
    expect(firstUnusedOption(slim, stacks([1, 1]))?.id).toBe(2);
  });
});
