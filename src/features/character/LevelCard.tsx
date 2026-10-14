import { jobAtLevel, jobLevelRange } from '@/data';
import { totalStatPoints } from '@/domain/rules';
import { Card, CardTitle } from '@/components/Card';
import { Stepper } from '@/components/Stepper';
import { Hint } from '@/components/Text';
import { useActions, useAppStore, useGameData } from '@/state';

export function LevelCard() {
  const data = useGameData();
  const character = useAppStore((state) => state.build.character);
  const actions = useActions();
  const range = jobLevelRange(data, character.jobId);
  const job = jobAtLevel(data, character.jobId, character.level);

  return (
    <Card>
      <CardTitle>Level</CardTitle>
      <Stepper
        size="lg"
        label="Character level"
        value={character.level}
        min={range.min}
        max={range.max}
        onChange={(level) => {
          actions.setLevel(level);
        }}
      />
      <Hint className="mt-2">
        range {range.min}–{range.max} · click ±1 · Shift ±10
      </Hint>
      <p className="mt-3 font-mono text-[12px] text-text-2">
        Job at this level: <span className="font-semibold text-accent">{job.name}</span>
      </p>
      <p className="mt-1 font-mono text-[12px] text-text-2">
        Total stat points:{' '}
        <span className="font-semibold text-accent">{totalStatPoints(character.level)}</span>{' '}
        <span className="text-dim">= 2 × (level − 1)</span>
      </p>
    </Card>
  );
}
