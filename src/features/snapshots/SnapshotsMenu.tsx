import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Fragment } from 'react';

import { Button } from '@/components/Button';
import { Panel } from '@/components/Panel';

import { SnapshotList } from './SnapshotList';

/** Header "Snapshots ▾" popover (plan D7): the snapshot list anchored under the button. */
export function SnapshotsMenu() {
  return (
    <Popover>
      <PopoverButton as={Fragment}>
        <Button>Snapshots ▾</Button>
      </PopoverButton>
      <PopoverPanel
        anchor="bottom end"
        transition
        className="z-50 w-[450px] max-w-[calc(100vw-2rem)] transition [--anchor-gap:6px] data-[closed]:opacity-0"
      >
        {({ close }) => (
          <Panel>
            <div className="mb-2.5 text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">
              Snapshots
            </div>
            <SnapshotList
              onDismiss={() => {
                close();
              }}
            />
          </Panel>
        )}
      </PopoverPanel>
    </Popover>
  );
}
