import { useState } from 'react';

import { Button } from '@/components/Button';
import { AppDialog, DialogActions } from '@/components/Dialog';
import type { ConfirmDialog as ConfirmDialogState, SnapshotChoice } from '@/state';

import { SnapshotOption } from './SnapshotOption';

/** Cancel plus the main action, with an optional snapshot choice (`dialog.snapshot`) passed to it. */
export function ConfirmDialog({
  dialog,
  onClose,
}: {
  dialog: ConfirmDialogState;
  onClose: () => void;
}) {
  const [snapshot, setSnapshot] = useState<SnapshotChoice>({
    keep: dialog.snapshot !== undefined,
    name: '',
  });

  return (
    <AppDialog open onClose={onClose} title={dialog.title} description={dialog.message}>
      {dialog.snapshot !== undefined && (
        <SnapshotOption reason={dialog.snapshot.reason} value={snapshot} onChange={setSnapshot} />
      )}
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant={dialog.danger ? 'danger' : 'primary'}
          onClick={() => {
            onClose();
            dialog.onConfirm(snapshot);
          }}
        >
          {dialog.confirmLabel}
        </Button>
      </DialogActions>
    </AppDialog>
  );
}
