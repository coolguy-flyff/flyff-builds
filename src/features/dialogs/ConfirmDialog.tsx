import { useId, useState } from 'react';

import { Button } from '@/components/Button';
import { AppDialog, DialogActions } from '@/components/Dialog';
import type { ConfirmDialog as ConfirmDialogState } from '@/state';

/** Cancel plus the main action, with an optional checkbox (`dialog.checkbox`) passed to it. */
export function ConfirmDialog({
  dialog,
  onClose,
}: {
  dialog: ConfirmDialogState;
  onClose: () => void;
}) {
  const { checkbox } = dialog;
  const checkboxId = useId();
  const [checked, setChecked] = useState(checkbox?.defaultChecked ?? false);

  return (
    <AppDialog open onClose={onClose} title={dialog.title} description={dialog.message}>
      {checkbox !== undefined && (
        <label
          htmlFor={checkboxId}
          className="flex cursor-pointer items-center gap-2 text-[12.5px] text-text"
        >
          <input
            id={checkboxId}
            type="checkbox"
            checked={checked}
            onChange={(event) => {
              setChecked(event.currentTarget.checked);
            }}
            className="accent-accent"
          />
          <span>{checkbox.label}</span>
        </label>
      )}
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant={dialog.danger ? 'danger' : 'primary'}
          onClick={() => {
            onClose();
            dialog.onConfirm(checked);
          }}
        >
          {dialog.confirmLabel}
        </Button>
      </DialogActions>
    </AppDialog>
  );
}
