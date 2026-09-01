import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';

import { requireClass } from '@/data';
import { Brand } from '@/components/Brand';
import { Button } from '@/components/Button';
import { ClassIcon } from '@/components/ItemIcon';
import { SnapshotsMenu } from '@/features/snapshots/SnapshotsMenu';
import { cx } from '@/lib/cx';
import { useActions, useAppStore, useGameData, type SaveStatus } from '@/state';

const SAVE_STATUS: Record<SaveStatus, { text: string; className: string }> = {
  saved: { text: 'Saved ✓', className: 'text-ok' },
  saving: { text: 'Saving…', className: 'text-muted' },
  error: { text: 'Not saved', className: 'text-danger' },
};

interface HeaderAction {
  readonly label: string;
  readonly run: () => void;
  readonly danger?: boolean;
}

/** Overflow menu replacing the action buttons on narrow screens (plan A0.1 mobile). */
function HeaderOverflowMenu({ items }: { items: readonly HeaderAction[] }) {
  return (
    <Menu>
      <MenuButton as={Button} aria-label="More actions" className="md:hidden">
        ⋯
      </MenuButton>
      <MenuItems
        anchor="bottom end"
        transition
        className="z-50 flex min-w-44 flex-col gap-0.5 rounded-sub bg-card p-1.5 shadow-panel [--anchor-gap:6px] data-[closed]:opacity-0"
      >
        {items.map((item) => (
          <MenuItem key={item.label}>
            <button
              type="button"
              onClick={item.run}
              className={cx(
                'rounded-[7px] px-3 py-2 text-left text-[12.5px] text-text data-[focus]:bg-control',
                item.danger === true && 'text-danger',
              )}
            >
              {item.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}

/** Persistent header (plan D2): brand, character pill, autosave indicator and session actions. */
export function AppHeader() {
  const data = useGameData();
  const character = useAppStore((state) => state.build.character);
  const saveStatus = useAppStore((state) => state.ui.saveStatus);
  const actions = useActions();
  const job = requireClass(data, character.jobId);
  const status = SAVE_STATUS[saveStatus];

  const confirmReset = (): void => {
    actions.openDialog({
      kind: 'confirm',
      title: 'Start over?',
      message:
        'This clears the working build. Snapshots are kept, and the current build is saved as an automatic snapshot first.',
      confirmLabel: 'Reset build',
      danger: true,
      onConfirm: () => {
        actions.resetBuild();
        actions.pushToast('info', 'Build reset — the previous build was kept as a snapshot.');
      },
    });
  };

  const openSaveAs = (): void => {
    actions.openDialog({ kind: 'saveAs' });
  };

  const openImport = (): void => {
    actions.openDialog({ kind: 'import', initialText: '' });
  };

  const openShare = (): void => {
    actions.openDialog({ kind: 'share' });
  };

  const overflowItems: readonly HeaderAction[] = [
    { label: 'Save as…', run: openSaveAs },
    {
      label: 'Snapshots',
      run: () => {
        actions.openDialog({ kind: 'snapshots' });
      },
    },
    { label: 'Import', run: openImport },
    { label: 'Share', run: openShare },
    { label: 'Reset', run: confirmReset, danger: true },
  ];

  return (
    <header className="bg-band px-4 py-2 md:px-6">
      <div className="mx-auto flex min-h-10 w-full max-w-[1400px] flex-wrap items-center gap-3">
        <Brand />
        <div className="flex items-center gap-2 rounded-[20px] bg-white/5 py-[5px] pr-3.5 pl-1.5">
          <ClassIcon icon={job.icon} size={26} alt="" />
          <span className="text-[13.5px] font-medium">{job.name}</span>
          <span className="font-mono text-[12px] text-muted">Lv {character.level}</span>
        </div>
        <span className={cx('ml-auto text-[12px]', status.className)}>{status.text}</span>
        <div className="hidden items-center gap-2 md:flex">
          <Button onClick={openSaveAs}>Save as…</Button>
          <SnapshotsMenu />
          <Button onClick={openImport}>Import</Button>
          <Button variant="primary" onClick={openShare}>
            Share
          </Button>
          <Button variant="danger" onClick={confirmReset}>
            Reset
          </Button>
        </div>
        <HeaderOverflowMenu items={overflowItems} />
      </div>
    </header>
  );
}
