import type { GameData } from '@/data';
import { StoreProvider, type AppStoreApi } from '@/state';

import { AppShell } from './AppShell';
import { ErrorBoundary } from './ErrorBoundary';

export function App({ store, data }: { store: AppStoreApi; data: GameData }) {
  return (
    <ErrorBoundary>
      <StoreProvider store={store} data={data}>
        <AppShell />
      </StoreProvider>
    </ErrorBoundary>
  );
}
