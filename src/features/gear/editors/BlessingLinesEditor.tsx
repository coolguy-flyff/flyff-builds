import { formatStatValue, type BlessingLine } from '@/domain/build';
import {
  blessingPieceCount,
  blessingSlotCapacity,
  blessingSlotsUsed,
  isRateBlessing,
  minBlessingSlots,
  reachableBlessingTotals,
} from '@/domain/rules';
import { Button } from '@/components/Button';
import { SubCard, type StatusTone } from '@/components/Card';
import { Select } from '@/components/Select';
import { SnapSlider } from '@/components/SnapSlider';
import { Hint } from '@/components/Text';
import { useGameData } from '@/state';

import { plural, statOptionLabel } from '../format';
import {
  addBlessingLine,
  blessingParameters,
  canAddBlessingLine,
  removeBlessingLine,
  withBlessingParameter,
  withBlessingTotal,
} from './blessingEditing';

function statusTone(used: number, capacity: number): StatusTone {
  let tone: StatusTone = 'muted';

  if (used > capacity) {
    tone = 'warn';
  } else if (used === capacity) {
    tone = 'ok';
  }

  return tone;
}

/**
 * Fashion blessings (plan A2.5): one line per stat with a total that snaps to the sums the
 * per-slot values can reach. Four pieces carry two slots each; a selected cloak adds a fifth
 * piece. Duplicate stats merge; above capacity the header warns but the totals are still used.
 */
export function BlessingLinesEditor({
  lines,
  hasCloak,
  onChange,
}: {
  lines: readonly BlessingLine[];
  hasCloak: boolean;
  onChange: (lines: BlessingLine[]) => void;
}) {
  const data = useGameData();
  const capacity = blessingSlotCapacity(hasCloak);
  const used = blessingSlotsUsed(data, lines);
  const statOptions = blessingParameters(data).map((parameter) => ({
    value: parameter,
    label: statOptionLabel(data, parameter, isRateBlessing(data, parameter)),
  }));

  return (
    <SubCard
      label="Blessings"
      note={`${blessingPieceCount(hasCloak)} pieces × 2 slots`}
      span
      status={`${used} / ${capacity} slots`}
      statusTone={statusTone(used, capacity)}
    >
      <div className="flex flex-col gap-2">
        {lines.map((line, index) => {
          const rate = isRateBlessing(data, line.parameter);
          const slots = minBlessingSlots(data, line.parameter, line.total);
          const rowLabel = `Blessing ${index + 1}`;

          return (
            <div key={`${index}-${line.parameter}`} className="flex flex-wrap items-center gap-2">
              <div className="w-[170px]">
                <Select
                  label={`${rowLabel} stat`}
                  size="sm"
                  value={line.parameter}
                  options={statOptions}
                  onChange={(parameter) => {
                    onChange(withBlessingParameter(data, lines, index, parameter));
                  }}
                />
              </div>
              <SnapSlider
                className="min-w-[160px] flex-1"
                label={`${rowLabel} total`}
                options={reachableBlessingTotals(data, line.parameter, capacity)}
                value={line.total}
                format={(value) => formatStatValue(value, rate)}
                onChange={(total) => {
                  onChange(withBlessingTotal(lines, index, total));
                }}
              />
              <span className="shrink-0 text-[10.5px] text-dim">
                {slots === undefined ? 'unreachable' : plural(slots, 'slot')}
              </span>
              <button
                type="button"
                aria-label={`Remove ${rowLabel}`}
                className="shrink-0 px-1 text-[12px] text-dim hover:text-text"
                onClick={() => {
                  onChange(removeBlessingLine(lines, index));
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
        {lines.length === 0 && <Hint>No blessings — add a line per stat.</Hint>}
      </div>
      {used > capacity && (
        <Hint tone="warn" className="mt-2">
          Needs {used} blessing slots; this fashion set has {capacity} — the totals are still used.
        </Hint>
      )}
      <Button
        size="sm"
        variant="soft"
        className="mt-2"
        disabled={!canAddBlessingLine(data, lines)}
        onClick={() => {
          onChange(addBlessingLine(data, lines));
        }}
      >
        + Add blessing
      </Button>
    </SubCard>
  );
}
