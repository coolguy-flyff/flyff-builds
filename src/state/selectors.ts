import type { GameData } from '@/data';
import {
  autoAccessorySetName,
  autoEquipmentSetName,
  autoFashionSetName,
  autoGearSwapName,
  autoPetName,
  autoShieldName,
  autoStatPageName,
  autoWeaponName,
  collectIssues,
  displayName,
  type AnyEntry,
  type BuildState,
  type EntryListKey,
  type Issue,
} from '@/domain/build';
import { memoByRef } from '@/lib/memo';

/**
 * Derived data over the build, memoised on the immutable `build` reference so components can call
 * these freely on every render.
 */
export function createSelectors(data: GameData) {
  const issuesOf = memoByRef((build: BuildState): readonly Issue[] => collectIssues(data, build));

  const namesOf = memoByRef((build: BuildState): ReadonlyMap<string, string> => {
    const names = new Map<string, string>();

    const register = (list: EntryListKey, entry: AnyEntry, auto: string): void => {
      names.set(`${list}:${entry.id}`, displayName(entry.customName, auto));
    };

    for (const page of build.statPages) {
      register('statPages', page, autoStatPageName(build, page));
    }

    for (const entry of build.equipmentSets) {
      register('equipmentSets', entry, autoEquipmentSetName(data, entry));
    }

    for (const entry of build.weapons) {
      register('weapons', entry, autoWeaponName(data, entry));
    }

    for (const entry of build.shields) {
      register('shields', entry, autoShieldName(data, entry));
    }

    for (const entry of build.accessorySets) {
      register('accessorySets', entry, autoAccessorySetName(data, entry));
    }

    for (const entry of build.fashionSets) {
      register('fashionSets', entry, autoFashionSetName(data, entry));
    }

    for (const entry of build.pets) {
      register('pets', entry, autoPetName(data, entry));
    }

    for (const swap of build.gearSwaps) {
      register('gearSwaps', swap, autoGearSwapName(data, build, swap));
    }

    return names;
  });

  return {
    issues: issuesOf,
    entryName(build: BuildState, list: EntryListKey, id: number): string {
      return namesOf(build).get(`${list}:${id}`) ?? `#${id}`;
    },
    autoName(build: BuildState, list: EntryListKey, entry: AnyEntry): string {
      let name: string;

      switch (list) {
        case 'statPages':
          name = autoStatPageName(build, entry as BuildState['statPages'][number]);
          break;
        case 'equipmentSets':
          name = autoEquipmentSetName(data, entry as BuildState['equipmentSets'][number]);
          break;
        case 'weapons':
          name = autoWeaponName(data, entry as BuildState['weapons'][number]);
          break;
        case 'shields':
          name = autoShieldName(data, entry as BuildState['shields'][number]);
          break;
        case 'accessorySets':
          name = autoAccessorySetName(data, entry as BuildState['accessorySets'][number]);
          break;
        case 'fashionSets':
          name = autoFashionSetName(data, entry as BuildState['fashionSets'][number]);
          break;
        case 'pets':
          name = autoPetName(data, entry as BuildState['pets'][number]);
          break;
        case 'gearSwaps':
          name = autoGearSwapName(data, build, entry as BuildState['gearSwaps'][number]);
          break;
      }

      return name;
    },
  };
}

export type Selectors = ReturnType<typeof createSelectors>;
