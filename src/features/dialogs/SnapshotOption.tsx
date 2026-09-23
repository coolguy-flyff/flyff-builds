import { useState } from 'react';

import { DialogCheckbox } from '@/components/Dialog';
import { SNAPSHOT_NAME_MAX_LENGTH } from '@/persistence';
import { useActions, type AutosaveReason, type SnapshotChoice } from '@/state';

/**
 * "Keep the current build as a snapshot" plus an optional name for it. Left blank, the snapshot
 * gets the autosave name shown as the placeholder.
 */
export function SnapshotOption({
  reason,
  value,
  onChange,
}: {
  reason: AutosaveReason;
  value: SnapshotChoice;
  onChange: (value: SnapshotChoice) => void;
}) {
  const actions = useActions();
  const [placeholder] = useState(() => actions.autosaveName(reason));

  return (
    <div className="flex flex-col gap-1.5">
      <DialogCheckbox
        label="Keep the current build as a snapshot"
        checked={value.keep}
        onChange={(keep) => {
          onChange({ ...value, keep });
        }}
      />
      <input
        type="text"
        aria-label="Snapshot name"
        value={value.name}
        maxLength={SNAPSHOT_NAME_MAX_LENGTH}
        placeholder={placeholder}
        disabled={!value.keep}
        onChange={(event) => {
          onChange({ ...value, name: event.currentTarget.value });
        }}
        className="ml-7 rounded-control bg-control px-3 py-2 text-[13px] text-text outline-none placeholder:text-dim disabled:opacity-50"
      />
    </div>
  );
}
