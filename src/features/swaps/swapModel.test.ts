import { describe, expect, it } from 'vitest';

import { CLASS_IDS } from '@/data';
import type { BuildState, EntryListKey, GearSwap } from '@/domain/build';
import { createTestStore, testGameData } from '@/features/buffs/testStore';
import { requireDefined } from '@/lib/assert';
import type { AppStoreApi } from '@/state';

import {
  compositionChips,
  IGNORED_VALUE,
  maskShortName,
  offhandFromValue,
  offhandModel,
} from './swapModel';

const data = testGameData();
const ORACLE = 54987; // two-handed stick (Seraph)
const OBSIDIAN_KNUCKLE = 3763; // one-handed (Assist line)
const AZURE_SHIELD = 469;
const REAPER_SWORD = 13243; // one-handed (Mercenary line)
const OBSIDIAN_SWORD = 2434; // one-handed (Mercenary line)
const ETRANAR_SET = 41091;
const HEALING_CAT_MASK = 13255;
const FIRST_SWAP = 2;

const nameOf = (list: EntryListKey, id: number): string => `${list}#${id}`;

function firstSwap(build: BuildState): GearSwap {
  return requireDefined(build.gearSwaps[0], 'the default build has one swap');
}

function addWeapon(store: AppStoreApi, itemId: number): number {
  const { actions } = store.getState();
  const id = actions.addEntry('weapons');
  actions.setWeaponItem(id, itemId);

  return id;
}

function addShield(store: AppStoreApi, itemId: number): number {
  const { actions } = store.getState();
  const id = actions.addEntry('shields');
  actions.setShieldItem(id, itemId);

  return id;
}

describe('offhandModel', () => {
  it('disables the slot for a two-handed mainhand and marks a stored shield as ignored', () => {
    const store = createTestStore();
    const weaponId = addWeapon(store, ORACLE);
    const shieldId = addShield(store, AZURE_SHIELD);
    store.getState().actions.updateEntry('gearSwaps', FIRST_SWAP, (swap) => {
      swap.weaponId = weaponId;
      swap.offhand = { kind: 'shield', id: shieldId };
    });
    const { build } = store.getState();
    const model = offhandModel(data, build, firstSwap(build), nameOf);

    expect(model).toMatchObject({
      kind: 'none',
      disabled: true,
      mismatch: true,
      value: IGNORED_VALUE,
      caption: '2H weapon — no offhand',
    });
    expect(model.options.map((option) => option.label)).toEqual([
      '— none —',
      `shields#${shieldId} (ignored)`,
    ]);
    expect(compositionChips(data, build, firstSwap(build), nameOf)).toEqual([
      'Oracle +0',
      'statPages#1',
    ]);
  });

  it('offers shields to a non-Slayer with a one-handed weapon', () => {
    const store = createTestStore();
    const weaponId = addWeapon(store, OBSIDIAN_KNUCKLE);
    const shieldId = addShield(store, AZURE_SHIELD);
    store.getState().actions.updateEntry('gearSwaps', FIRST_SWAP, (swap) => {
      swap.weaponId = weaponId;
      swap.offhand = { kind: 'shield', id: shieldId };
    });
    const { build } = store.getState();
    const model = offhandModel(data, build, firstSwap(build), nameOf);

    expect(model).toMatchObject({
      kind: 'shield',
      disabled: false,
      mismatch: false,
      value: String(shieldId),
      caption: null,
    });
    expect(model.options.map((option) => option.value)).toEqual(['', String(shieldId)]);
    expect(compositionChips(data, build, firstSwap(build), nameOf)).toEqual([
      'Bloody Obsidian Knuckle +0',
      'Azure Shield +0',
      'statPages#1',
    ]);
  });

  it('offers a Slayer the other one-handed weapons, never the mainhand or a two-hander', () => {
    const store = createTestStore();
    store.getState().actions.setJob(CLASS_IDS.slayer);
    const mainhand = addWeapon(store, REAPER_SWORD);
    const second = addWeapon(store, OBSIDIAN_SWORD);
    addWeapon(store, ORACLE);
    store.getState().actions.updateEntry('gearSwaps', FIRST_SWAP, (swap) => {
      swap.weaponId = mainhand;
    });
    const { build } = store.getState();
    const model = offhandModel(data, build, firstSwap(build), nameOf);

    expect(model).toMatchObject({ kind: 'weapon', disabled: false, mismatch: false, value: '' });
    expect(model.options.map((option) => option.value)).toEqual(['', String(second)]);
  });
});

describe('offhandFromValue', () => {
  it('maps the select value to the stored offhand shape', () => {
    expect(offhandFromValue('shield', '')).toBeNull();
    expect(offhandFromValue('shield', '11')).toEqual({ kind: 'shield', id: 11 });
    expect(offhandFromValue('weapon', '12')).toEqual({ kind: 'weapon', id: 12 });
    expect(offhandFromValue('none', '11')).toBeNull();
    expect(offhandFromValue('weapon', IGNORED_VALUE)).toBeNull();
  });
});

describe('maskShortName', () => {
  it('keeps the effect family and drops the mask style', () => {
    expect(maskShortName('Healing Statted Cat Mask')).toBe('Healing mask');
    expect(maskShortName('HP/MP Statted Glasses (Black)')).toBe('HP/MP mask');
    expect(maskShortName('Plain Mask')).toBe('Plain Mask');
  });
});

describe('compositionChips', () => {
  it('summarises the picks with short names, custom names winning', () => {
    const store = createTestStore();
    const { actions } = store.getState();
    const equipmentId = actions.addEntry('equipmentSets');
    actions.setEquipmentSet(equipmentId, ETRANAR_SET);
    actions.updateEntry('equipmentSets', equipmentId, (entry) => {
      entry.upgrade = 10;
    });
    const weaponId = addWeapon(store, ORACLE);
    actions.setCustomName('weapons', weaponId, 'My stick');
    const petId = actions.addEntry('pets');
    actions.updateEntry('gearSwaps', FIRST_SWAP, (swap) => {
      swap.equipmentSetId = equipmentId;
      swap.weaponId = weaponId;
      swap.petId = petId;
      swap.maskItemId = HEALING_CAT_MASK;
    });
    const { build } = store.getState();

    expect(compositionChips(data, build, firstSwap(build), nameOf)).toEqual([
      'Etranar +10',
      'My stick',
      `pets#${petId}`,
      'Healing mask',
      'statPages#1',
    ]);
  });
});
