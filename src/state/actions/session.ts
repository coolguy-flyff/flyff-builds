import { requireClass } from '@/data';
import { createDefaultBuild, type BuildState, type BuildWarning } from '@/domain/build';
import {
  deleteSnapshot,
  listSnapshots,
  loadSnapshot,
  overwriteSnapshot,
  renameSnapshot,
  saveSnapshot,
  StorageError,
  type SnapshotMeta,
} from '@/persistence';

import { emptySelection, type ActionContext } from './shared';

export interface SessionActions {
  /** Replaces the working build (after an import or a snapshot load). */
  replaceBuild(build: BuildState, warnings?: readonly BuildWarning[]): void;
  /** Auto-snapshots the current build, then starts over from defaults. */
  resetBuild(): void;
  saveSnapshot(name: string): SnapshotMeta | undefined;
  /** Stores an automatic snapshot such as "Autosave before reset"; failures become toasts. */
  autoSnapshot(label: string): void;
  loadSnapshot(id: string): boolean;
  /** Replaces a snapshot's contents with the current build; `false` when storage refused (toasted). */
  overwriteSnapshot(id: string): boolean;
  renameSnapshot(id: string, name: string): void;
  deleteSnapshot(id: string): void;
  refreshSnapshots(): void;
  defaultSnapshotName(): string;
}

function formatTime(now: number): string {
  const date = new Date(now);
  const pad = (value: number): string => value.toString().padStart(2, '0');

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function warningToast(
  warnings: readonly BuildWarning[],
): { message: string; details: string[] } | undefined {
  let toast: { message: string; details: string[] } | undefined;

  if (warnings.length > 0) {
    toast = {
      message: `${warnings.length} adjustment${warnings.length === 1 ? '' : 's'} made while loading`,
      details: warnings.map((warning) => warning.message),
    };
  }

  return toast;
}

export function createSessionActions(
  context: ActionContext,
  pushToast: (
    kind: 'info' | 'success' | 'warning' | 'error',
    message: string,
    details?: readonly string[],
  ) => void,
): SessionActions {
  const { set, get, deps } = context;

  const withStorage = (operation: () => void): boolean => {
    let ok = true;

    try {
      operation();
    } catch (error) {
      ok = false;

      if (error instanceof StorageError) {
        pushToast('error', error.message);
      } else {
        throw error;
      }
    }

    return ok;
  };

  const refresh = (): void => {
    set((draft) => {
      draft.ui.snapshots = listSnapshots(deps.storage);
    });
  };

  return {
    replaceBuild(build, warnings = []) {
      set((draft) => {
        draft.build = build;
        draft.ui.selected = emptySelection();
        draft.ui.expandedSwapId = build.gearSwaps[0]?.id ?? null;
        draft.ui.results = { ...draft.ui.results, baselineSwapId: null, hiddenSwapIds: [] };
      });

      const toast = warningToast(warnings);

      if (toast !== undefined) {
        pushToast('warning', toast.message, toast.details);
      }
    },

    resetBuild() {
      this.autoSnapshot('Autosave before reset');
      this.replaceBuild(createDefaultBuild(deps.data));
    },

    saveSnapshot(name) {
      let meta: SnapshotMeta | undefined;

      withStorage(() => {
        meta = saveSnapshot(deps.storage, get().build, name, deps.now());
      });
      refresh();

      return meta;
    },

    autoSnapshot(label) {
      withStorage(() => {
        saveSnapshot(
          deps.storage,
          get().build,
          `${label} ${formatTime(deps.now())}`,
          deps.now(),
          true,
        );
      });
      refresh();
    },

    loadSnapshot(id) {
      const loaded = loadSnapshot(deps.storage, deps.data, id);
      let ok = false;

      if (loaded.ok) {
        this.autoSnapshot('Autosave before load');
        this.replaceBuild(loaded.value.build, loaded.value.warnings);
        ok = true;
      } else {
        pushToast('error', `Could not load snapshot: ${loaded.message}`);
      }

      return ok;
    },

    overwriteSnapshot(id) {
      const ok = withStorage(() => {
        overwriteSnapshot(deps.storage, id, get().build, deps.now());
      });

      refresh();

      return ok;
    },

    renameSnapshot(id, name) {
      withStorage(() => {
        renameSnapshot(deps.storage, id, name.trim().slice(0, 64));
      });
      refresh();
    },

    deleteSnapshot(id) {
      withStorage(() => {
        deleteSnapshot(deps.storage, id);
      });
      refresh();
    },

    refreshSnapshots: refresh,

    defaultSnapshotName() {
      const { character } = get().build;
      const job = requireClass(deps.data, character.jobId);

      return `${job.name} ${character.level} — ${formatTime(deps.now())}`;
    },
  };
}
