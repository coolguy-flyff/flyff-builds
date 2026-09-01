import { requireClass } from '@/data';
import { totalStatPoints } from '@/domain/rules';
import { Card, CardTitle } from '@/components/Card';
import { Stepper } from '@/components/Stepper';
import { Hint } from '@/components/Text';
import { useActions, useAppStore, useGameData } from '@/state';

export function LevelCard() {
  const data = useGameData();
  const character = useAppStore((state) => state.build.character);
  const actions = useActions();
  const job = requireClass(data, character.jobId);

  return (
    <Card>
      <CardTitle>Level</CardTitle>
      <Stepper
        size="lg"
        label="Character level"
        value={character.level}
        min={job.minLevel}
        max={job.maxLevel}
        onChange={(level) => {
          actions.setLevel(level);
        }}
      />
      <Hint className="mt-2">
        range {job.minLevel}–{job.maxLevel} · click ±1 · Shift ±10
      </Hint>
      <p className="mt-3 font-mono text-[12px] text-text-2">
        Total stat points:{' '}
        <span className="font-semibold text-accent">{totalStatPoints(character.level)}</span>{' '}
        <span className="text-dim">= 2 × (level − 1)</span>
      </p>
    </Card>
  );
}
