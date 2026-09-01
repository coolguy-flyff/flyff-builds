import { useEffect } from 'react';

import { Hint } from '@/components/Text';
import { useActions, useAppStore } from '@/state';

import { SnapshotRow } from './SnapshotRow';

/**
 * Snapshot rows, newest first, with the empty state and the footer hint (plan A0.2 / D7). Shared by
 * the header popover and the Snapshots dialog; re-reads storage on mount so other tabs' saves show.
 */
export function SnapshotList({
  onDismiss,
}: {
  /** Called before a confirm dialog opens so a popover host can close itself. */
  onDismiss?: (() => void) | undefined;
}) {
  const snapshots = useAppStore((state) => state.ui.snapshots);
  const actions = useActions();

  useEffect(() => {
    actions.refreshSnapshots();
  }, [actions]);

  let body;

  if (snapshots.length === 0) {
    body = (
      <p className="rounded-sub bg-sub px-4 py-6 text-center text-[12.5px] text-text-2">
        No snapshots yet. Use Save as… to keep a copy of the current build.
      </p>
    );
  } else {
    body = (
      <ul
        aria-label="Snapshots"
        className="flex max-h-[min(60vh,420px)] flex-col gap-1.5 overflow-y-auto"
      >
        {snapshots.map((meta) => (
          <SnapshotRow key={meta.id} meta={meta} onDismiss={onDismiss} />
        ))}
      </ul>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {body}
      <Hint>Loading keeps your current build as an automatic snapshot.</Hint>
    </div>
  );
}
