import type { SnapshotMeta } from '@/persistence';
import type { AppActions, ConfirmDialog } from '@/state';

export interface SnapshotCommands {
  /** Confirms, then replaces the working build with the snapshot (auto-snapshot first). */
  readonly load: () => void;
  /** Confirms, then stores the working build into the snapshot. */
  readonly overwrite: () => void;
  /** Confirms, then deletes the snapshot. */
  readonly remove: () => void;
}

/**
 * The destructive snapshot actions of plan A0.2, each behind a confirm dialog. `onDismiss` lets
 * the host (the header popover) close itself before the modal opens.
 */
export function createSnapshotCommands(
  actions: AppActions,
  meta: SnapshotMeta,
  onDismiss: (() => void) | undefined,
): SnapshotCommands {
  const confirm = (dialog: Omit<ConfirmDialog, 'kind'>): void => {
    onDismiss?.();
    actions.openDialog({ kind: 'confirm', ...dialog });
  };

  return {
    load: () => {
      confirm({
        title: 'Load snapshot?',
        message: `Replace your current working build with '${meta.name}'? Your current build will be kept as an automatic snapshot.`,
        confirmLabel: 'Load snapshot',
        danger: false,
        onConfirm: () => {
          if (actions.loadSnapshot(meta.id)) {
            actions.pushToast('success', `Loaded snapshot '${meta.name}'`);
          }
        },
      });
    },

    overwrite: () => {
      confirm({
        title: 'Overwrite snapshot?',
        message: `Replace the contents of '${meta.name}' with your current working build? The previous contents cannot be recovered.`,
        confirmLabel: 'Overwrite',
        danger: true,
        onConfirm: () => {
          if (actions.overwriteSnapshot(meta.id)) {
            actions.pushToast('success', `Snapshot '${meta.name}' now holds the current build`);
          }
        },
      });
    },

    remove: () => {
      confirm({
        title: 'Delete snapshot?',
        message: `Delete '${meta.name}'? This cannot be undone.`,
        confirmLabel: 'Delete snapshot',
        danger: true,
        onConfirm: () => {
          actions.deleteSnapshot(meta.id);
        },
      });
    },
  };
}
