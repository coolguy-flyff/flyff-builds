import { createContext } from 'react';

import type { GameData } from '@/data';

import type { Selectors } from './selectors';
import type { AppStoreApi } from './store';

export interface StoreContextValue {
  readonly store: AppStoreApi;
  readonly data: GameData;
  readonly selectors: Selectors;
}

export const StoreContext = createContext<StoreContextValue | null>(null);
