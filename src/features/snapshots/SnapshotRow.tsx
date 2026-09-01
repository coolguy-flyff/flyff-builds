import { useState, type KeyboardEvent } from 'react';

import { Button } from '@/components/Button';
import { DropdownMenu, type DropdownMenuItem } from '@/components/DropdownMenu';
import { ClassIcon } from '@/components/ItemIcon';
import { cx } from '@/lib/cx';
import type { SnapshotMeta } from '@/persistence';
import { useActions, useGameData } from '@/state';

import { snapshotMetaLine } from './format';
import { createSnapshotCommands } from './snapshotCommands';

const ICON_SIZE = 26;
const NAME_MAX_LENGTH = 64;

/** One snapshot (plan D7): job icon, name with inline rename, meta line, Load and the ⋯ menu. */
export function SnapshotRow({
  meta,
  onDismiss,
}: {
  meta: SnapshotMeta;
  /** Called before a confirm dialog opens so a popover host can close itself. */
  onDismiss?: (() => void) | undefined;
}) {
  const data = useGameData();
  const actions = useActions();
  const [draft, setDraft] = useState<string | null>(null);
  // Snapshot metas come straight from storage, so an unknown job (older data) must not crash the menu.
  const job = data.classes.get(meta.jobId);
  const commands = createSnapshotCommands(actions, meta, onDismiss);

  const commitRename = (): void => {
    if (draft !== null) {
      const trimmed = draft.trim();

      if (trimmed !== '' && trimmed !== meta.name) {
        actions.renameSnapshot(meta.id, trimmed);
      }

      setDraft(null);
    }
  };

  const onRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      event.preventDefault();
      commitRename();
    } else if (event.key === 'Escape') {
      // Keep the Escape for the rename: the popover and the dialog would otherwise close on it.
      event.preventDefault();
      event.stopPropagation();
      setDraft(null);
    }
  };

  const menuItems: DropdownMenuItem[] = [
    {
      key: 'rename',
      label: 'Rename',
      onSelect: () => {
        setDraft(meta.name);
      },
    },
    { key: 'overwrite', label: 'Overwrite with current', onSelect: commands.overwrite },
    { key: 'delete', label: 'Delete', danger: true, onSelect: commands.remove },
  ];

  let name;

  if (draft === null) {
    name = (
      <div className="truncate text-[12.5px] font-semibold text-text" title={meta.name}>
        {meta.name}
      </div>
    );
  } else {
    name = (
      <input
        autoFocus
        type="text"
        aria-label="Snapshot name"
        value={draft}
        maxLength={NAME_MAX_LENGTH}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
        }}
        onFocus={(event) => {
          event.currentTarget.select();
        }}
        onBlur={commitRename}
        onKeyDown={onRenameKeyDown}
        className="w-full rounded-control bg-control px-2 py-0.5 text-[12.5px] font-semibold text-text outline-none"
      />
    );
  }

  return (
    <li
      className={cx(
        'flex items-center gap-2.5 rounded-sub bg-sub px-3 py-2.5',
        meta.automatic && 'opacity-75',
      )}
    >
      {job === undefined ? (
        <span
          aria-hidden="true"
          className="inline-block shrink-0 rounded-[4px] bg-control"
          style={{ width: ICON_SIZE, height: ICON_SIZE }}
        />
      ) : (
        <ClassIcon icon={job.icon} size={ICON_SIZE} alt="" />
      )}
      <div className="min-w-0 flex-1">
        {name}
        <div className="truncate font-mono text-[10.5px] text-muted">
          {snapshotMetaLine(job?.name ?? 'Unknown job', meta)}
        </div>
      </div>
      <Button size="sm" variant="primary" onClick={commands.load}>
        Load
      </Button>
      <DropdownMenu
        label={`More actions for ${meta.name}`}
        items={menuItems}
        variant="ghost"
        size="sm"
      >
        ⋯
      </DropdownMenu>
    </li>
  );
}
