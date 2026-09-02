import { describe, expect, it } from 'vitest';

import { UPCUT_STONE_ITEM_ID } from '../../src/data/constants';

import {
  getAllChainIds,
  getClassChain,
  getThirdJobIds,
  isEligibleShield,
  isEligibleWeapon,
  isPowerup,
  isStatCloak,
  isStatPet,
  isBundledArmorSet,
} from './select';
import type { RawClass, RawEquipSet, RawItem, RawPet } from './source';

function rawClass(overrides: Partial<RawClass> & Pick<RawClass, 'id' | 'type'>): RawClass {
  return {
    name: { en: `Class ${overrides.id}` },
    icon: 'x.png',
    minLevel: 1,
    maxLevel: 190,
    hp: 1,
    mp: 1,
    fp: 1,
    defense: 1,
    magicDefenseStaFactor: 1,
    magicDefenseIntFactor: 1,
    attackSpeed: 70,
    block: 1,
    critical: 1,
    autoAttackFactors: {},
    ...overrides,
  };
}

function rawItem(overrides: Partial<RawItem> & Pick<RawItem, 'id'>): RawItem {
  return {
    name: { en: `Item ${overrides.id}` },
    icon: 'x.png',
    level: 1,
    category: 'material',
    rarity: 'common',
    ...overrides,
  };
}

const classes: Record<string, RawClass> = {
  '1': rawClass({ id: 1, type: 'beginner' }),
  '2': rawClass({ id: 2, type: 'expert', parent: 1 }),
  '3': rawClass({ id: 3, type: 'professional', parent: 2 }),
  '4': rawClass({ id: 4, type: 'specialist', parent: 3 }),
  '9': rawClass({ id: 9, type: 'professional', parent: 2 }),
};

describe('class selection', () => {
  it('finds third jobs and their ancestor chains', () => {
    const thirdJobs = getThirdJobIds(classes);

    expect([...thirdJobs]).toEqual([4]);
    expect(getClassChain(classes, 4)).toEqual([4, 3, 2, 1]);
    expect(getClassChain(classes, 42)).toEqual([]);
    expect([...getAllChainIds(classes, thirdJobs)].sort()).toEqual([1, 2, 3, 4]);
  });
});

describe('item selection', () => {
  const chainIds = new Set([1, 2, 3, 4]);

  it('accepts rare-and-above weapons usable by the chain, from any level but skins', () => {
    expect(
      isEligibleWeapon(
        rawItem({ id: 10, category: 'weapon', level: 15, rarity: 'rare', class: 2 }),
        chainIds,
      ),
    ).toBe(true);
    expect(
      isEligibleWeapon(
        rawItem({ id: 14, category: 'weapon', level: 1, rarity: 'veryrare', class: 2 }),
        chainIds,
      ),
    ).toBe(false);
    expect(
      isEligibleWeapon(
        rawItem({ id: 11, category: 'weapon', level: 120, rarity: 'ultimate' }),
        chainIds,
      ),
    ).toBe(true);
    expect(
      isEligibleWeapon(
        rawItem({ id: 12, category: 'weapon', level: 150, rarity: 'uncommon', class: 2 }),
        chainIds,
      ),
    ).toBe(false);
    expect(
      isEligibleWeapon(
        rawItem({ id: 13, category: 'weapon', level: 150, rarity: 'veryrare', class: 9 }),
        chainIds,
      ),
    ).toBe(false);
  });

  it('accepts rare-and-above shields, skins excluded', () => {
    expect(
      isEligibleShield(rawItem({ id: 15, subcategory: 'shield', level: 120, rarity: 'rare' })),
    ).toBe(true);
    expect(
      isEligibleShield(rawItem({ id: 16, subcategory: 'shield', level: 118, rarity: 'common' })),
    ).toBe(false);
    expect(
      isEligibleShield(rawItem({ id: 17, subcategory: 'shield', level: 1, rarity: 'veryrare' })),
    ).toBe(false);
  });

  it('keeps only cloaks that carry a stat and a name', () => {
    const statted = rawItem({
      id: 20,
      category: 'fashion',
      subcategory: 'cloak',
      abilities: [{ parameter: 'int', add: 8, rate: false }],
    });
    const plain = rawItem({ id: 21, category: 'fashion', subcategory: 'cloak' });
    const unnamed = rawItem({ ...statted, id: 22, name: { en: '' } });

    expect(isStatCloak(statted)).toBe(true);
    expect(isStatCloak(plain)).toBe(false);
    expect(isStatCloak(unnamed)).toBe(false);
  });

  it('treats consumables with stats, and the Upcut Stone, as powerups', () => {
    const eel = rawItem({
      id: 30,
      category: 'recovery',
      duration: 1800,
      abilities: [{ parameter: 'maxhp', add: 50, rate: true }],
    });
    const cure = rawItem({ id: 31, category: 'buff', abilities: [{ parameter: 'cure' }] });
    const upcut = rawItem({ id: UPCUT_STONE_ITEM_ID, category: 'scroll', duration: 3600 });

    expect(isPowerup(eel)).toBe(true);
    expect(isPowerup(cure)).toBe(false);
    expect(isPowerup(upcut)).toBe(true);
  });

  it('requires a pet definition with a stat parameter', () => {
    const pets: Record<string, RawPet> = {
      '40': { petItemId: 40, parameter: 'sta', rate: false, values: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
      '41': { petItemId: 41 },
    };

    expect(isStatPet(rawItem({ id: 40, category: 'raisedpet' }), pets)).toBe(true);
    expect(isStatPet(rawItem({ id: 41, category: 'raisedpet' }), pets)).toBe(false);
    expect(isStatPet(rawItem({ id: 42, category: 'raisedpet' }), pets)).toBe(false);
  });
});

describe('armor set selection', () => {
  const armor = { category: 'armor', level: 120, class: 4 } as const;
  const items: Record<string, RawItem> = {
    '50': rawItem({ id: 50, ...armor, subcategory: 'helmet' }),
    '51': rawItem({ id: 51, ...armor, subcategory: 'suit' }),
    '52': rawItem({ id: 52, ...armor, subcategory: 'gauntlet' }),
    '53': rawItem({ id: 53, ...armor, subcategory: 'boots' }),
    '54': rawItem({ id: 54, ...armor, subcategory: 'boots', level: 1 }),
    '55': rawItem({ id: 55, ...armor, subcategory: 'helmet', class: 9 }),
    '60': rawItem({ id: 60, category: 'jewelry', subcategory: 'ring' }),
  };
  const chainIds = new Set([1, 2, 3, 4]);

  function set(id: number, parts: number[]): RawEquipSet {
    return { id, name: { en: `Set ${id}` }, parts, bonus: [] };
  }

  it('accepts four chain-job armor parts and rejects everything else', () => {
    expect(isBundledArmorSet(set(1, [50, 51, 52, 53]), items, chainIds)).toBe(true);
    expect(isBundledArmorSet(set(2, [50, 51, 52]), items, chainIds)).toBe(false);
    expect(isBundledArmorSet(set(3, [60, 60, 60, 60]), items, chainIds)).toBe(false);
    expect(isBundledArmorSet(set(4, [50, 51, 52, 999]), items, chainIds)).toBe(false);
    // A set for a job outside every chain (off-chain professional) is rejected.
    expect(isBundledArmorSet(set(5, [55, 51, 52, 53]), items, new Set([1, 2, 3]))).toBe(false);
    // Level-1 parts are skins.
    expect(isBundledArmorSet(set(6, [50, 51, 52, 54]), items, chainIds)).toBe(false);
  });
});
