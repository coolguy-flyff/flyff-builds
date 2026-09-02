import { current } from 'immer';

import {
  createAccessorySetEntry,
  createEquipmentSetEntry,
  createFashionSetEntry,
  createGearSwap,
  createPetEntry,
  createShieldEntry,
  createStatPage,
  createWeaponEntry,
  repairReferences,
  type AnyEntry,
  type BuildState,
  type EntryListKey,
  type EntryOf,
  type GearSwap,
} from '@/domain/build';
import type { AppState } from '../types';

import { takeId, type ActionContext } from './shared';

export interface ListActions {
  addEntry(list: EntryListKey): number;
  duplicateEntry(list: EntryListKey, id: number): number | undefined;
  removeEntry(list: EntryListKey, id: number): boolean;
  /** Moves an entry by `delta` positions (clamped to the list). */
  moveEntry(list: EntryListKey, id: number, delta: number): void;
  /** Moves an entry to the position `targetId` currently holds (drag & drop). */
  moveEntryTo(list: EntryListKey, id: number, targetId: number): void;
  setCustomName(list: EntryListKey, id: number, name: string | undefined): void;
  updateEntry<K extends EntryListKey>(
    list: K,
    id: number,
    recipe: (entry: EntryOf<K>) => void,
  ): void;
}

/** The lists are heterogeneous; this is the one place that widens them for generic CRUD. */
function entriesOf(build: BuildState, list: EntryListKey): AnyEntry[] {
  return build[list];
}

function firstId(entries: readonly { id: number }[]): number | null {
  return entries[0]?.id ?? null;
}

/** Re-inserts `entries[from]` at `to`; out-of-range positions (including -1 lookups) are ignored. */
function moveWithin(entries: AnyEntry[], from: number, to: number): void {
  if (from === -1 || to < 0 || to >= entries.length) {
    return;
  }

  const [entry] = entries.splice(from, 1);

  if (entry !== undefined) {
    entries.splice(to, 0, entry);
  }
}

/** A new swap is pre-filled with the first entry of every list so results appear immediately. */
function prefilledSwap(build: BuildState, id: number): GearSwap {
  const swap = createGearSwap(id, build.statPages[0]?.id ?? 1);
  const weapon = build.weapons[0];

  swap.equipmentSetId = firstId(build.equipmentSets);
  swap.accessorySetId = firstId(build.accessorySets);
  swap.weaponId = weapon?.id ?? null;
  swap.fashionSetId = firstId(build.fashionSets);
  swap.petId = firstId(build.pets);

  const shield = build.shields[0];

  if (shield !== undefined) {
    swap.offhand = { kind: 'shield', id: shield.id };
  }

  return swap;
}

function createEntry(build: BuildState, list: EntryListKey, id: number): AnyEntry {
  let entry: AnyEntry;

  switch (list) {
    case 'statPages':
      entry = createStatPage(id);
      break;
    case 'equipmentSets':
      entry = createEquipmentSetEntry(id, null);
      break;
    case 'weapons':
      entry = createWeaponEntry(id);
      break;
    case 'shields':
      entry = createShieldEntry(id);
      break;
    case 'accessorySets':
      entry = createAccessorySetEntry(id, null);
      break;
    case 'fashionSets':
      entry = createFashionSetEntry(id);
      break;
    case 'pets':
      entry = createPetEntry(id, null, 0);
      break;
    case 'gearSwaps':
      entry = prefilledSwap(build, id);
      break;
  }

  return entry;
}

const MINIMUM_COUNT: Partial<Record<EntryListKey, number>> = { statPages: 1, gearSwaps: 1 };

function selectNeighbour(draft: AppState, list: EntryListKey, removedIndex: number): void {
  const entries = entriesOf(draft.build, list);
  const neighbour = entries[Math.min(removedIndex, entries.length - 1)];

  draft.ui.selected[list] = neighbour?.id ?? null;
}

export function createListActions({ set, get }: ActionContext): ListActions {
  return {
    addEntry(list) {
      let created = 0;

      set((draft) => {
        const id = takeId(draft);
        entriesOf(draft.build, list).push(createEntry(draft.build, list, id));
        draft.ui.selected[list] = id;
        created = id;
      });

      return created;
    },

    duplicateEntry(list, id) {
      let created: number | undefined;

      set((draft) => {
        const entries = entriesOf(draft.build, list);
        const index = entries.findIndex((entry) => entry.id === id);
        const source = entries[index];

        if (source === undefined) {
          return;
        }

        const copy = structuredClone(current(source));
        copy.id = takeId(draft);

        if (copy.customName !== undefined) {
          copy.customName = `${copy.customName} (copy)`;
        }

        entries.splice(index + 1, 0, copy);
        draft.ui.selected[list] = copy.id;
        created = copy.id;
      });

      return created;
    },

    removeEntry(list, id) {
      const minimum = MINIMUM_COUNT[list] ?? 0;
      let removed = false;

      if (entriesOf(get().build, list).length > minimum) {
        set((draft) => {
          const entries = entriesOf(draft.build, list);
          const index = entries.findIndex((entry) => entry.id === id);

          if (index === -1) {
            return;
          }

          entries.splice(index, 1);
          draft.build = repairReferences(draft.build).build;

          if (draft.ui.selected[list] === id) {
            selectNeighbour(draft, list, index);
          }

          removed = true;
        });
      }

      return removed;
    },

    moveEntry(list, id, delta) {
      set((draft) => {
        const entries = entriesOf(draft.build, list);
        const index = entries.findIndex((entry) => entry.id === id);

        moveWithin(entries, index, index + delta);
      });
    },

    moveEntryTo(list, id, targetId) {
      set((draft) => {
        const entries = entriesOf(draft.build, list);
        const index = entries.findIndex((entry) => entry.id === id);
        const target = entries.findIndex((entry) => entry.id === targetId);

        moveWithin(entries, index, target);
      });
    },

    setCustomName(list, id, name) {
      set((draft) => {
        const entry = entriesOf(draft.build, list).find((candidate) => candidate.id === id);

        if (entry === undefined) {
          return;
        }

        const trimmed = name?.trim() ?? '';

        if (trimmed === '') {
          delete entry.customName;
        } else {
          entry.customName = trimmed.slice(0, 32);
        }
      });
    },

    updateEntry(list, id, recipe) {
      set((draft) => {
        const entry = entriesOf(draft.build, list).find((candidate) => candidate.id === id);

        if (entry !== undefined) {
          recipe(entry);
        }
      });
    },
  };
}
