import { describe, expect, it } from 'vitest';

import { CLASS_IDS, loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { createMemoryStorage, readCurrentBuild, StorageError } from '@/persistence';

import { bindAutosave } from './autosave';
import { createAppStore } from './store';

const data = loadBundledGameData();
const ORACLE = 54987;
const ETRANAR_SET = 41091;

function setup() {
  const storage = createMemoryStorage();
  let now = 1_000;
  const store = createAppStore({ data, storage, now: () => now }, createDefaultBuild(data));

  return { store, storage, tick: () => (now += 1) };
}

describe('lists', () => {
  it('adds, duplicates, reorders and removes entries and repairs swap references', () => {
    const { store } = setup();
    const { actions } = store.getState();

    const weaponId = actions.addEntry('weapons');
    actions.setWeaponItem(weaponId, ORACLE);
    actions.setWeaponUpgrade(weaponId, 10);
    actions.setCustomName('weapons', weaponId, '  My stick  ');

    const copyId = actions.duplicateEntry('weapons', weaponId);
    const weapons = store.getState().build.weapons;

    expect(weapons.map((entry) => entry.id)).toEqual([weaponId, copyId]);
    expect(weapons[1]?.customName).toBe('My stick (copy)');
    expect(weapons[1]?.randomStats.length).toBe(4);
    expect(store.getState().ui.selected.weapons).toBe(copyId);

    actions.moveEntry('weapons', copyId ?? 0, -1);
    expect(store.getState().build.weapons.map((entry) => entry.id)).toEqual([copyId, weaponId]);

    actions.moveEntryTo('weapons', weaponId, copyId ?? 0);
    expect(store.getState().build.weapons.map((entry) => entry.id)).toEqual([weaponId, copyId]);

    actions.updateEntry('gearSwaps', 2, (swap) => {
      swap.weaponId = weaponId;
    });
    expect(actions.removeEntry('weapons', weaponId)).toBe(true);
    expect(store.getState().build.gearSwaps[0]?.weaponId).toBeNull();
    expect(store.getState().ui.selected.weapons).toBe(copyId);
  });

  it('keeps at least one stat page and one swap', () => {
    const { store } = setup();
    const { actions } = store.getState();

    expect(actions.removeEntry('statPages', 1)).toBe(false);
    expect(actions.removeEntry('gearSwaps', 2)).toBe(false);
  });

  it('pre-fills a new swap with the first entry of every list', () => {
    const { store } = setup();
    const { actions } = store.getState();
    const equipmentId = actions.addEntry('equipmentSets');
    const petId = actions.addEntry('pets');
    const swapId = actions.addEntry('gearSwaps');
    const swap = store.getState().build.gearSwaps.find((entry) => entry.id === swapId);

    expect(swap?.equipmentSetId).toBe(equipmentId);
    expect(swap?.petId).toBe(petId);
    expect(swap?.statPageId).toBe(1);
  });
});

describe('stat pages', () => {
  it('clamps allocations so remaining points never go negative and maxes into a stat', () => {
    const { store } = setup();
    const { actions } = store.getState();

    expect(actions.setStat(1, 'sta', 500)).toBe(393);
    expect(actions.setStat(1, 'str', 20)).toBe(15);
    expect(actions.setStat(1, 'sta', 300)).toBe(300);
    actions.maxStat(1, 'int');
    expect(store.getState().build.statPages[0]).toMatchObject({
      str: 15,
      sta: 300,
      dex: 15,
      int: 108,
    });
    actions.resetStatPage(1);
    expect(store.getState().build.statPages[0]).toMatchObject({
      str: 15,
      sta: 15,
      dex: 15,
      int: 15,
    });
  });
});

describe('character', () => {
  it('switching job removes incompatible gear and clears swap slots', () => {
    const { store } = setup();
    const { actions } = store.getState();
    const equipmentId = actions.addEntry('equipmentSets');
    actions.setEquipmentSet(equipmentId, ETRANAR_SET);
    const weaponId = actions.addEntry('weapons');
    actions.setWeaponItem(weaponId, ORACLE);
    actions.updateEntry('gearSwaps', 2, (swap) => {
      swap.equipmentSetId = equipmentId;
      swap.weaponId = weaponId;
    });

    expect(actions.previewJobChange(CLASS_IDS.templar)).toEqual({
      equipmentSets: 1,
      weapons: 1,
      shields: 0,
    });

    actions.setJob(CLASS_IDS.templar);
    const { build } = store.getState();

    expect(build.character.jobId).toBe(CLASS_IDS.templar);
    expect(build.equipmentSets).toEqual([]);
    expect(build.weapons).toEqual([]);
    expect(build.gearSwaps[0]?.equipmentSetId).toBeNull();
    expect(build.gearSwaps[0]?.weaponId).toBeNull();
  });
});

describe('session & autosave', () => {
  it('autosaves every build change and round-trips through storage', () => {
    const { store, storage } = setup();
    const unsubscribe = bindAutosave(
      store,
      storage,
      () => 5,
      (callback) => {
        callback();

        return undefined;
      },
    );

    store.getState().actions.setLevel(180);

    const loaded = readCurrentBuild(storage, data, 6);

    expect(loaded.kind).toBe('loaded');

    if (loaded.kind === 'loaded') {
      expect(loaded.build.character.level).toBe(180);
    }

    expect(store.getState().ui.saveStatus).toBe('saved');
    unsubscribe();
  });

  it('snapshots survive a reset and can be loaded back', () => {
    const { store, tick } = setup();
    const { actions } = store.getState();

    actions.setLevel(170);
    const meta = actions.saveSnapshot('Before');
    tick();
    actions.resetBuild();

    expect(store.getState().build.character.level).toBe(190);
    expect(store.getState().ui.snapshots.map((snapshot) => snapshot.name)).toEqual(
      expect.arrayContaining(['Before']),
    );
    expect(store.getState().ui.snapshots.some((snapshot) => snapshot.automatic)).toBe(true);

    expect(actions.loadSnapshot(meta?.id ?? '')).toBe(true);
    expect(store.getState().build.character.level).toBe(170);
    expect(store.getState().ui.snapshots.length).toBe(3);
  });

  it('surfaces storage failures as toasts instead of throwing', () => {
    const failing = createMemoryStorage();

    failing.set = () => {
      throw new StorageError('Could not save to browser storage', new Error('quota'));
    };

    const store = createAppStore(
      { data, storage: failing, now: () => 1 },
      createDefaultBuild(data),
    );
    const { actions } = store.getState();

    expect(() => actions.saveSnapshot('x')).not.toThrow();
    expect(store.getState().ui.toasts.map((toast) => toast.kind)).toEqual(['error']);
    expect(store.getState().ui.snapshots).toEqual([]);
  });
});
