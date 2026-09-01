import { Button } from '@/components/Button';
import { AppDialog, DialogActions } from '@/components/Dialog';
import type { ConfirmDialog as ConfirmDialogState } from '@/state';

export function ConfirmDialog({
  dialog,
  onClose,
}: {
  dialog: ConfirmDialogState;
  onClose: () => void;
}) {
  return (
    <AppDialog open onClose={onClose} title={dialog.title} description={dialog.message}>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant={dialog.danger ? 'danger' : 'primary'}
          onClick={() => {
            onClose();
            dialog.onConfirm();
          }}
        >
          {dialog.confirmLabel}
        </Button>
      </DialogActions>
    </AppDialog>
  );
}
