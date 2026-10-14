import { jobChoicesAtLevel, type JobChoice } from '@/data';
import { Card, CardTitle } from '@/components/Card';
import { ClassIcon } from '@/components/ItemIcon';
import { Hint } from '@/components/Text';
import { Tile, TileGroup } from '@/components/Tile';
import { requireDefined } from '@/lib/assert';
import { useActions, useAppStore, useGameData, type SnapshotChoice } from '@/state';

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

/** The third-job path a switch to `choice` stores. */
function pathOf(choice: JobChoice): number {
  return requireDefined(choice.pathJobIds[0], `No path leads through ${choice.job.name}`);
}

/**
 * Job tiles (plan A1.1) for the jobs of the character's level: the third jobs from Lv 165, the
 * second jobs from Lv 60 and the first jobs below. The build stores a third-job path, so picking
 * a first job (two paths lead through it) picks its first path; the job tiles of a higher level
 * choose between them. A switch that would remove gear asks for confirmation first, with the automatic snapshot of the
 * current build as an opt-out; a switch that removes nothing keeps the snapshot without asking.
 */
export function JobCard() {
  const data = useGameData();
  const character = useAppStore((state) => state.build.character);
  const actions = useActions();
  const choices = jobChoicesAtLevel(data, character.level);

  const switchTo = (choice: JobChoice, snapshot: SnapshotChoice): void => {
    const { job } = choice;

    if (snapshot.keep) {
      actions.autoSnapshot('job change', snapshot.name);
    }

    const removed = describeRemoved(actions.setJob(pathOf(choice)));
    actions.pushToast(
      'info',
      removed.length === 0
        ? `Switched to ${job.name}`
        : `Switched to ${job.name} — removed ${removed.join(', ')}`,
    );
  };

  const select = (choice: JobChoice): void => {
    const { job } = choice;

    if (choice.pathJobIds.includes(character.jobId)) {
      return;
    }

    const removed = describeRemoved(actions.previewJobChange(pathOf(choice)));

    if (removed.length === 0) {
      switchTo(choice, { keep: true, name: '' });
    } else {
      actions.openDialog({
        kind: 'confirm',
        title: `Switch to ${job.name}?`,
        message: `Switching to ${job.name} removes gear that ${job.name} can't use: ${removed.join(', ')}. Swaps keep their other picks.`,
        confirmLabel: `Switch to ${job.name}`,
        danger: false,
        snapshot: { reason: 'job change' },
        onConfirm: (snapshot) => {
          switchTo(choice, snapshot);
        },
      });
    }
  };

  return (
    <Card>
      <CardTitle>Job</CardTitle>
      <TileGroup label="Job" columns={4}>
        {choices.map((choice) => (
          <Tile
            key={choice.job.id}
            selected={choice.pathJobIds.includes(character.jobId)}
            onSelect={() => {
              select(choice);
            }}
            icon={<ClassIcon icon={choice.job.icon} size={32} alt="" />}
            label={choice.job.name}
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
