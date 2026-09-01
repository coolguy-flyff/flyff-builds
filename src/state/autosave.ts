import { StorageError, writeCurrentBuild, type StorageAdapter } from '@/persistence';

import type { AppStoreApi } from './store';

const SAVED_INDICATOR_MS = 600;

/**
 * Writes the working build synchronously whenever it changes (a new `build` reference), flips
 * the header indicator to "Saving…" briefly, and surfaces storage failures instead of hiding them.
 */
export function bindAutosave(
  store: AppStoreApi,
  storage: StorageAdapter,
  now: () => number,
  schedule: (callback: () => void, ms: number) => unknown = setTimeout,
): () => void {
  return store.subscribe(
    (state) => state.build,
    (build) => {
      const { actions } = store.getState();

      try {
        actions.setSaveStatus('saving');
        writeCurrentBuild(storage, build, now());
        schedule(() => {
          if (store.getState().ui.saveStatus === 'saving') {
            actions.setSaveStatus('saved');
          }
        }, SAVED_INDICATOR_MS);
      } catch (error) {
        actions.setSaveStatus('error');

        if (error instanceof StorageError) {
          actions.pushToast('error', `${error.message}. Changes are not being saved.`);
        } else {
          throw error;
        }
      }
    },
  );
}
