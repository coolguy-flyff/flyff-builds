import type { AppState, AppStoreDeps, SelectedEntries } from '../types';

/** Immer-style setter: mutate the draft, zustand produces the next immutable state. */
export type StoreSet = (recipe: (draft: AppState) => void) => void;
export type StoreGet = () => AppState;

export interface ActionContext {
  readonly set: StoreSet;
  readonly get: StoreGet;
  readonly deps: AppStoreDeps;
}

/** Allocates the next per-build entry id inside a draft. */
export function takeId(draft: AppState): number {
  const id = draft.build.nextId;
  draft.build.nextId = id + 1;

  return id;
}

/** Nothing selected in any list. */
export function emptySelection(): SelectedEntries {
  return {
    statPages: null,
    equipmentSets: null,
    weapons: null,
    shields: null,
    accessorySets: null,
    fashionSets: null,
    pets: null,
    gearSwaps: null,
  };
}
