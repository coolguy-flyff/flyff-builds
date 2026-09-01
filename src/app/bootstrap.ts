import { loadBundledGameData, type GameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { readCurrentBuild, type StorageAdapter } from '@/persistence';
import { bindAutosave, createAppStore, type AppStoreApi } from '@/state';

export interface BootstrapEnv {
  readonly storage: StorageAdapter;
  readonly now: () => number;
  /** The page URL; a `?b=<code>` query opens the Import dialog pre-filled. */
  readonly href: string;
  readonly replaceUrl: (url: string) => void;
}

export interface BootstrapResult {
  readonly store: AppStoreApi;
  readonly data: GameData;
}

/**
 * Plan B5 bootstrap order: data → working build (or defaults) → store → autosave → `?b=` import.
 * Never replaces the working build silently: a shared link only opens the Import preview.
 */
export function bootstrapApp(env: BootstrapEnv): BootstrapResult {
  const data = loadBundledGameData();
  const loaded = readCurrentBuild(env.storage, data, env.now());
  const build = loaded.kind === 'loaded' ? loaded.build : createDefaultBuild(data);
  const store = createAppStore({ data, storage: env.storage, now: env.now }, build);

  bindAutosave(store, env.storage, env.now);

  const { actions } = store.getState();

  if (loaded.kind === 'corrupt') {
    actions.pushToast(
      'error',
      'Your saved build could not be read, so a fresh build was started.',
      [
        `The unreadable data was kept in browser storage under "${loaded.preservedKey}".`,
        loaded.message,
      ],
    );
  } else if (loaded.kind === 'loaded' && loaded.warnings.length > 0) {
    const count = loaded.warnings.length;

    actions.pushToast(
      'warning',
      `${count} adjustment${count === 1 ? '' : 's'} made while loading your saved build`,
      loaded.warnings.map((warning) => warning.message),
    );
  }

  const url = new URL(env.href);

  if (url.searchParams.has('b')) {
    actions.openDialog({ kind: 'import', initialText: env.href });
    url.searchParams.delete('b');
    env.replaceUrl(url.toString());
  }

  return { store, data };
}
