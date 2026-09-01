import { useState } from 'react';

import { Button } from '@/components/Button';
import { AppDialog, DialogActions } from '@/components/Dialog';
import { FieldLabel } from '@/components/Text';
import { useActions } from '@/state';

const INPUT_ID = 'snapshot-name';
const NAME_MAX_LENGTH = 64;

/** "Save as…" (plan A0.2): names and stores an immutable snapshot of the working build. */
export function SaveAsDialog({ onClose }: { onClose: () => void }) {
  const actions = useActions();
  const [defaultName] = useState(() => actions.defaultSnapshotName());
  const [name, setName] = useState(defaultName);

  const save = (): void => {
    const trimmed = name.trim();
    const meta = actions.saveSnapshot(trimmed === '' ? defaultName : trimmed);

    // On a storage failure the store has already toasted; keep the dialog open so nothing is lost.
    if (meta !== undefined) {
      onClose();
      actions.pushToast('success', `Saved snapshot '${meta.name}'`);
    }
  };

  return (
    <AppDialog
      open
      onClose={onClose}
      title="Save as…"
      description="Keeps an immutable copy of the working build on this device. Later edits never touch it."
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          save();
        }}
      >
        <FieldLabel htmlFor={INPUT_ID} className="mb-1.5">
          Snapshot name
        </FieldLabel>
        <input
          id={INPUT_ID}
          autoFocus
          data-autofocus
          type="text"
          value={name}
          maxLength={NAME_MAX_LENGTH}
          placeholder={defaultName}
          onChange={(event) => {
            setName(event.currentTarget.value);
          }}
          onFocus={(event) => {
            event.currentTarget.select();
          }}
          className="w-full rounded-control bg-control px-3 py-2 text-[13px] text-text outline-none placeholder:text-dim"
        />
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </DialogActions>
      </form>
    </AppDialog>
  );
}
