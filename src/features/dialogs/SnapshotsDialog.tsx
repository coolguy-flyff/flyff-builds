import { Button } from '@/components/Button';
import { AppDialog, DialogActions } from '@/components/Dialog';
import { SnapshotList } from '@/features/snapshots/SnapshotList';

/** The snapshot list as a modal, for hosts without room for the header popover (plan A5.4). */
export function SnapshotsDialog({ onClose }: { onClose: () => void }) {
  return (
    <AppDialog
      open
      onClose={onClose}
      title="Snapshots"
      description="Saved copies of your builds on this device."
    >
      <SnapshotList />
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </AppDialog>
  );
}
