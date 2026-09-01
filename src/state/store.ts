import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { createStore, type Mutate, type StoreApi } from 'zustand/vanilla';

import type { BuildState } from '@/domain/build';
import { listSnapshots } from '@/persistence';

import { createBuffActions, type BuffActions } from './actions/buffs';
import { createCharacterActions, type CharacterActions } from './actions/character';
import { createGearActions, type GearActions } from './actions/gear';
import { createListActions, type ListActions } from './actions/lists';
import { createSessionActions, type SessionActions } from './actions/session';
import { emptySelection, type ActionContext } from './actions/shared';
import { createStatPageActions, type StatPageActions } from './actions/statPages';
import { createUiActions, type UiActions } from './actions/ui';
import type { AppState, AppStoreDeps, UiState } from './types';

export type AppActions = CharacterActions &
  ListActions &
  StatPageActions &
  GearActions &
  BuffActions &
  SessionActions &
  UiActions;

export interface AppStore extends AppState {
  readonly actions: AppActions;
}

/** The store type including the middleware-added APIs (selector subscriptions, immer setters). */
export type AppStoreApi = Mutate<
  StoreApi<AppStore>,
  [['zustand/subscribeWithSelector', never], ['zustand/immer', never]]
>;

function initialUi(deps: AppStoreDeps, build: BuildState): UiState {
  return {
    gearCategory: 'equipmentSets',
    selected: emptySelection(),
    expandedSwapId: build.gearSwaps[0]?.id ?? null,
    results: {
      baselineSwapId: null,
      onlyDiffering: false,
      highlightBest: true,
      showRawTotals: false,
      hiddenSwapIds: [],
      collapsedGroups: [],
    },
    toasts: [],
    dialog: null,
    saveStatus: 'saved',
    snapshots: listSnapshots(deps.storage),
  };
}

/**
 * Creates an isolated store instance. Actions are plain functions closed over `set`/`get`; state
 * updates go through immer so nested edits stay readable while the store remains immutable.
 */
export function createAppStore(deps: AppStoreDeps, initialBuild: BuildState): AppStoreApi {
  return createStore<AppStore>()(
    subscribeWithSelector(
      immer((set, get) => {
        const context: ActionContext = {
          set: (recipe) => {
            set((draft) => {
              recipe(draft);
            });
          },
          get: () => get(),
          deps,
        };
        const ui = createUiActions(context);
        const actions: AppActions = {
          ...createCharacterActions(context),
          ...createListActions(context),
          ...createStatPageActions(context),
          ...createGearActions(context),
          ...createBuffActions(context),
          ...createSessionActions(context, (kind, message, details) =>
            ui.pushToast(kind, message, details),
          ),
          ...ui,
        };

        return { build: initialBuild, ui: initialUi(deps, initialBuild), actions };
      }),
    ),
  );
}
