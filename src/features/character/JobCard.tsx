import type { SlimClass } from '@/data';
import { Card, CardTitle } from '@/components/Card';
import { ClassIcon } from '@/components/ItemIcon';
import { Hint } from '@/components/Text';
import { Tile, TileGroup } from '@/components/Tile';
import { useActions, useAppStore, useGameData } from '@/state';

interface RemovalCounts {
  readonly equipmentSets: number;
  readonly weapons: number;
  readonly shields: number;
}

function describeRemoved(counts: RemovalCounts): string[] {
  const parts: string[] = [];

  const add = (count: number, noun: string): void => {
    if (count > 0) {
      parts.push(`${count} ${noun}${count === 1 ? '' : 's'}`);
    }
  };

  add(counts.equipmentSets, 'equipment set');
  add(counts.weapons, 'weapon');
  add(counts.shields, 'shield');

  return parts;
}

/**
 * Job tiles (plan A1.1). A switch that would remove gear asks for confirmation first; either way
 * the current build is kept as an automatic snapshot before the change.
 */
export function JobCard() {
  const data = useGameData();
  const jobId = useAppStore((state) => state.build.character.jobId);
  const actions = useActions();

  const switchTo = (job: SlimClass): void => {
    actions.autoSnapshot('Autosave before job change');
    const removed = describeRemoved(actions.setJob(job.id));
    actions.pushToast(
      'info',
      removed.length === 0
        ? `Switched to ${job.name}`
        : `Switched to ${job.name} — removed ${removed.join(', ')}`,
    );
  };

  const select = (job: SlimClass): void => {
    if (job.id === jobId) {
      return;
    }

    const removed = describeRemoved(actions.previewJobChange(job.id));

    if (removed.length === 0) {
      switchTo(job);
    } else {
      actions.openDialog({
        kind: 'confirm',
        title: `Switch to ${job.name}?`,
        message: `Switching to ${job.name} removes gear that ${job.name} can't use: ${removed.join(', ')}. Swaps keep their other picks. A snapshot of the current build is saved first.`,
        confirmLabel: `Switch to ${job.name}`,
        danger: false,
        onConfirm: () => {
          switchTo(job);
        },
      });
    }
  };

  return (
    <Card>
      <CardTitle>Job</CardTitle>
      <TileGroup label="Job" columns={4}>
        {data.thirdJobs.map((job) => (
          <Tile
            key={job.id}
            selected={job.id === jobId}
            onSelect={() => {
              select(job);
            }}
            icon={<ClassIcon icon={job.icon} size={32} alt="" />}
            label={job.name}
            surface="sub"
          />
        ))}
      </TileGroup>
      <Hint className="mt-2.5">
        Switching job removes gear the new job can't use; accessory sets, fashion, pets and stat
        pages are kept.
      </Hint>
    </Card>
  );
}
