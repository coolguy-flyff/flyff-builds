import { describe, expect, it } from 'vitest';

import { normalizeAbilities, projectHousingNpc } from './project';
import { derivePierceTarget, resolveAccessorySet, resolveArmorSet } from './resolveSets';
import type { RawEquipSet, RawItem } from './source';
import { formatTable } from './write';

function rawItem(overrides: Partial<RawItem> & Pick<RawItem, 'id' | 'name'>): RawItem {
  return {
    icon: 'x.png',
    level: 180,
    category: 'armor',
    rarity: 'veryrare',
    ...overrides,
  };
}

describe('resolveArmorSet', () => {
  const items: Record<string, RawItem> = {
    '1': rawItem({
      id: 1,
      name: { en: 'Helmet' },
      subcategory: 'helmet',
      class: 26141,
      sex: 'female',
      level: 180,
    }),
    '2': rawItem({
      id: 2,
      name: { en: 'Suit' },
      subcategory: 'suit',
      class: 26141,
      sex: 'female',
      level: 180,
    }),
    '3': rawItem({
      id: 3,
      name: { en: 'Gauntlets' },
      subcategory: 'gauntlet',
      class: 26141,
      sex: 'female',
      level: 180,
    }),
    '4': rawItem({
      id: 4,
      name: { en: 'Boots' },
      subcategory: 'boots',
      class: 26141,
      sex: 'female',
      level: 185,
    }),
  };

  it('keys parts by subcategory and takes the highest part level', () => {
    const set: RawEquipSet = {
      id: 7,
      name: { en: 'Etranar Set' },
      parts: [4, 3, 2, 1],
      bonus: [{ equipped: 4, ability: { parameter: 'maxhp', add: 35, rate: true } }],
    };

    expect(resolveArmorSet(set, items)).toEqual({
      id: 7,
      name: 'Etranar Set',
      jobId: 26141,
      sex: 'female',
      level: 185,
      parts: { helmet: 1, suit: 2, gauntlet: 3, boots: 4 },
      bonus: [{ equipped: 4, ability: { parameter: 'maxhp', add: 35, rate: true } }],
    });
  });

  it('rejects duplicate or missing parts', () => {
    const duplicate: RawEquipSet = { id: 8, name: { en: 'Bad' }, parts: [1, 1, 2, 3], bonus: [] };
    const missing: RawEquipSet = { id: 9, name: { en: 'Bad' }, parts: [1, 2, 3, 99], bonus: [] };

    expect(() => resolveArmorSet(duplicate, items)).toThrow(/duplicate helmet/);
    expect(() => resolveArmorSet(missing, items)).toThrow(/item 99 does not exist/);
  });
});

describe('resolveAccessorySet', () => {
  const items: Record<string, RawItem> = {
    '10': rawItem({
      id: 10,
      name: { en: "Adept's Ring" },
      category: 'jewelry',
      subcategory: 'ring',
    }),
    '11': rawItem({
      id: 11,
      name: { en: "Adept's Plug Earring" },
      category: 'jewelry',
      subcategory: 'earring',
    }),
    '12': rawItem({
      id: 12,
      name: { en: "Adept's Demol Earring" },
      category: 'jewelry',
      subcategory: 'earring',
    }),
    '13': rawItem({
      id: 13,
      name: { en: "Adept's Gore Necklace" },
      category: 'jewelry',
      subcategory: 'necklace',
    }),
    '14': rawItem({
      id: 14,
      name: { en: "Adept's Mental Necklace" },
      category: 'jewelry',
      subcategory: 'necklace',
    }),
    '15': rawItem({
      id: 15,
      name: { en: "Adept's Peision Necklace" },
      category: 'jewelry',
      subcategory: 'necklace',
    }),
  };

  it('classifies variants by name and keeps peision optional', () => {
    const withoutPeision: RawEquipSet = {
      id: 1,
      name: { en: "Adept's Set" },
      parts: [10, 10, 11, 11, 12, 12, 13, 14],
      bonus: [],
    };
    const withPeision: RawEquipSet = {
      ...withoutPeision,
      id: 2,
      parts: [...withoutPeision.parts, 15],
    };

    expect(resolveAccessorySet(withoutPeision, items)).toEqual({
      id: 1,
      name: "Adept's Set",
      ring: 10,
      earrings: { plug: 11, demol: 12 },
      necklaces: { gore: 13, mental: 14 },
      bonus: [],
    });
    expect(resolveAccessorySet(withPeision, items).necklaces).toEqual({
      gore: 13,
      mental: 14,
      peision: 15,
    });
  });

  it('fails when a variant is missing', () => {
    const set: RawEquipSet = { id: 3, name: { en: 'Partial' }, parts: [10, 11, 13], bonus: [] };

    expect(() => resolveAccessorySet(set, items)).toThrow(/missing ring\/earring\/necklace/);
  });
});

describe('derivePierceTarget', () => {
  it('reads the slot from the card name suffix', () => {
    expect(derivePierceTarget(rawItem({ id: 1, name: { en: 'Volcano Card (7%)' } }))).toBe('suit');
    expect(derivePierceTarget(rawItem({ id: 2, name: { en: 'Land Card (A)' } }))).toBe('weapon');
    expect(() => derivePierceTarget(rawItem({ id: 3, name: { en: 'Mystery Card' } }))).toThrow(
      /no recognised slot suffix/,
    );
  });
});

describe('projections', () => {
  it('normalises abilities: drops status effects, defaults rate to flat, strips undefined keys', () => {
    expect(
      normalizeAbilities([
        { parameter: 'allstats', add: 3 },
        { parameter: 'cure' },
        { parameter: 'speed', add: 5, rate: true, addMax: undefined },
      ]),
    ).toEqual([
      { parameter: 'allstats', add: 3, rate: false },
      { parameter: 'speed', add: 5, rate: true },
    ]);
  });

  it('derives the housing group from the name prefix', () => {
    const npc = projectHousingNpc({
      id: 2,
      name: { en: '[Personal House NPC] Temas' },
      abilities: [],
    });

    expect(npc).toEqual({
      id: 2,
      name: '[Personal House NPC] Temas',
      shortName: 'Temas',
      group: 'personal',
      abilities: [],
    });
    expect(() => projectHousingNpc({ id: 3, name: { en: 'Nobody' }, abilities: [] })).toThrow(
      /group prefix/,
    );
  });
});

describe('formatTable', () => {
  it('writes one record per line for arrays and objects', () => {
    expect(formatTable([{ a: 1 }, { b: 2 }])).toBe('[\n  {"a":1},\n  {"b":2}\n]\n');
    expect(formatTable({ x: [1], y: 'z' })).toBe('{\n  "x": [1],\n  "y": "z"\n}\n');
    expect(formatTable([])).toBe('[]\n');
  });
});
