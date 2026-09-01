import { render, type RenderResult } from '@testing-library/react';
import type { ReactNode } from 'react';

import type { GameData } from '@/data';
import { StoreProvider, type AppStoreApi } from '@/state';

import { testGameData } from './testStore';

/** Renders `ui` inside a store provider (jsdom component tests). */
export function renderWithStore(
  ui: ReactNode,
  store: AppStoreApi,
  data: GameData = testGameData(),
): RenderResult {
  return render(
    <StoreProvider store={store} data={data}>
      {ui}
    </StoreProvider>,
  );
}
