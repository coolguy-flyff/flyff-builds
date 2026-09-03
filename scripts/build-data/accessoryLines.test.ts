import { describe, expect, it } from 'vitest';

import { parseLineItemName, resolveAccessoryLine } from './accessoryLines';
import type { RawItem } from './source';

function jewel(id: number, name: string, subcategory: string): RawItem {
  return {
    id,
    name: { en: name },
    icon: `${name}.png`,
    level: 60,
    category: 'jewelry',
    subcategory,
    rarity: 'rare',
  };
}

describe('parseLineItemName', () => {
  it('splits the "+N" tier suffix and treats a bare name as upgrade 0', () => {
    expect(parseLineItemName('Speedo +3')).toEqual({ name: 'Speedo', upgrade: 3 });
    expect(parseLineItemName('Meteofy')).toEqual({ name: 'Meteofy', upgrade: 0 });
  });
});

describe('resolveAccessoryLine', () => {
  const items: RawItem[] = [
    jewel(30, 'Speedo +3', 'earring'),
    jewel(10, 'Speedo +1', 'earring'),
    jewel(20, 'Speedo +2', 'earring'),
    // Same name, wrong slot: a ring called Speedo is not part of the earring line.
    jewel(99, 'Speedo +1', 'ring'),
    jewel(50, 'Meteofy', 'ring'),
  ];

  it('orders the tiers by upgrade and takes the id and icon from the lowest tier', () => {
    expect(resolveAccessoryLine('Speedo', 'earring', items)).toEqual({
      id: 10,
      name: 'Speedo',
      slot: 'earring',
      icon: 'Speedo +1.png',
      tiers: [
        { upgrade: 1, itemId: 10 },
        { upgrade: 2, itemId: 20 },
        { upgrade: 3, itemId: 30 },
      ],
    });
  });

  it('resolves a single untiered item as one tier at upgrade 0', () => {
    expect(resolveAccessoryLine('Meteofy', 'ring', items).tiers).toEqual([
      { upgrade: 0, itemId: 50 },
    ]);
  });

  it('fails on a missing line and on gaps or duplicates between tiers', () => {
    expect(() => resolveAccessoryLine('Penzeru', 'earring', items)).toThrow(/no items/);
    expect(() =>
      resolveAccessoryLine('Speedo', 'earring', [...items, jewel(40, 'Speedo +5', 'earring')]),
    ).toThrow(/contiguous/);
    expect(() =>
      resolveAccessoryLine('Speedo', 'earring', [...items, jewel(41, 'Speedo +2', 'earring')]),
    ).toThrow(/contiguous/);
  });
});
