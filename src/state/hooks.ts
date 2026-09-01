import { useContext } from 'react';
import { useStore } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

import type { GameData } from '@/data';
import type { BuildState } from '@/domain/build';

import { StoreContext, type StoreContextValue } from './context';
import type { Selectors } from './selectors';
import type { AppActions, AppStore } from './store';

export function useStoreContext(): StoreContextValue {
  const context = useContext(StoreContext);

  if (context === null) {
    throw new Error('Store hooks must be used inside <StoreProvider>');
  }

  return context;
}

export function useAppStore<T>(selector: (state: AppStore) => T): T {
  return useStore(useStoreContext().store, selector);
}

/** Selects an object/array of values with shallow comparison to avoid re-renders. */
export function useAppStoreShallow<T>(selector: (state: AppStore) => T): T {
  return useStore(useStoreContext().store, useShallow(selector));
}

export function useActions(): AppActions {
  return useStoreContext().store.getState().actions;
}

export function useGameData(): GameData {
  return useStoreContext().data;
}

export function useSelectors(): Selectors {
  return useStoreContext().selectors;
}

export function useBuild(): BuildState {
  return useAppStore((state) => state.build);
}
