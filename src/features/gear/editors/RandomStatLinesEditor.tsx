import type { SlimItem } from '@/data';
import { formatStatValue, type RandomStatLine } from '@/domain/build';
import { randomStatBounds, randomStatLineCount } from '@/domain/rules';
import { Select } from '@/components/Select';
import { SnapSlider, type SnapSliderTone } from '@/components/SnapSlider';
import { cx } from '@/lib/cx';
import { useGameData } from '@/state';

import { statOptionLabel } from '../format';
import { stepValues } from '../values';
import {
  paddedRandomStatLines,
  possibleRandomStat,
  usedRandomStatParameters,
  withRandomStatParameter,
  withRandomStatValue,
  type RandomStatLines,
} from './randomStatEditing';

const NONE_VALUE = '';

/** Lines 1–2 (yellow) in the first column, 3–4 (orange) in the second — the in-game colours. */
const COLUMNS: readonly { readonly indices: readonly number[]; readonly tone: SnapSliderTone }[] = [
  { indices: [0, 1], tone: 'rand1' },
  { indices: [2, 3], tone: 'rand2' },
];

const TONE_TEXT: Record<SnapSliderTone, string> = {
  accent: 'text-accent',
  rand1: 'text-rand1',
  rand2: 'text-rand2',
};

/**
 * Ultimate random-stat lines (plan A2.2): stat select (no duplicates across unlocked lines) and a
 * value slider on the stat's (halved for lines 3–4) range. Lines the upgrade hasn't unlocked are
 * greyed and empty (lowering the upgrade clears them) — and stale locked lines from an old build
 * never block a stat on the unlocked lines.
 */
export function RandomStatLinesEditor({
  item,
  upgrade,
  lines,
  onChange,
  label,
}: {
  item: SlimItem;
  upgrade: number;
  lines: RandomStatLines;
  onChange: (lines: (RandomStatLine | null)[]) => void;
  label: string;
}) {
  const data = useGameData();
  const padded = paddedRandomStatLines(lines);
  const activeCount = randomStatLineCount(upgrade);
  const possible = item.possibleRandomStats ?? [];

  const renderLine = (index: number, tone: SnapSliderTone) => {
    const line = padded[index] ?? null;
    const locked = index >= activeCount;
    const used = usedRandomStatParameters(padded, index, activeCount);
    const ability = line === null ? undefined : possibleRandomStat(item, line.parameter);
    const lineLabel = `${label} line ${index + 1}`;

    return (
      <div
        key={index}
        className={cx('flex items-center gap-2', locked && 'opacity-50')}
        data-locked={locked ? 'true' : undefined}
      >
        <span className="w-3 shrink-0 font-mono text-[12px] text-dim">{index + 1}</span>
        <div className="w-[148px] shrink-0">
          <Select
            label={`${lineLabel} stat`}
            size="sm"
            value={line?.parameter ?? NONE_VALUE}
            disabled={locked}
            valueClassName={line === null ? undefined : TONE_TEXT[tone]}
            options={[
              { value: NONE_VALUE, label: '— none —' },
              ...possible.map((candidate) => ({
                value: candidate.parameter,
                label: statOptionLabel(data, candidate.parameter, candidate.rate),
                disabled: used.has(candidate.parameter),
              })),
            ]}
            onChange={(parameter) => {
              onChange(
                withRandomStatParameter(
                  item,
                  padded,
                  index,
                  parameter === NONE_VALUE ? null : parameter,
                  activeCount,
                ),
              );
            }}
          />
        </div>
        <SnapSlider
          className="min-w-0 flex-1"
          label={`${lineLabel} value`}
          tone={tone}
          options={ability === undefined ? [] : stepValues(randomStatBounds(ability, index))}
          value={line?.value ?? 0}
          disabled={locked || ability === undefined}
          format={(value) => (ability === undefined ? '—' : formatStatValue(value, ability.rate))}
          onChange={(value) => {
            onChange(withRandomStatValue(padded, index, value));
          }}
        />
      </div>
    );
  };

  return (
    <div className="grid gap-x-4 gap-y-2 md:grid-cols-2">
      {COLUMNS.map((column) => (
        <div key={column.tone} className="flex flex-col gap-2">
          {column.indices.map((index) => renderLine(index, column.tone))}
        </div>
      ))}
    </div>
  );
}
