import { useMemo, type ReactNode } from 'react';

import type { GameData } from '@/data';

import { StoreContext, type StoreContextValue } from './context';
import { createSelectors } from './selectors';
import type { AppStoreApi } from './store';

export function StoreProvider({
  store,
  data,
  children,
}: {
  store: AppStoreApi;
  data: GameData;
  children: ReactNode;
}) {
  const value = useMemo<StoreContextValue>(
    () => ({ store, data, selectors: createSelectors(data) }),
    [store, data],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
