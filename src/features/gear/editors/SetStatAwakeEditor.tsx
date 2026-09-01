import { STAT_KEYS, type StatKey } from '@/data';
import type { SetStatAwake, SetStatAwakeLine } from '@/domain/build';
import { SET_AWAKE_MAX_TOTAL, setAwakePartnerOptions, setAwakeSecondTotals } from '@/domain/rules';
import { Select, type SelectOption } from '@/components/Select';
import { SnapSlider } from '@/components/SnapSlider';
import { useGameData } from '@/state';

import { asStatKey, formatUpgrade } from '../format';
import { nearestValue } from '../values';

const NONE_OPTION: SelectOption = { value: '', label: 'None' };

const FIRST_TOTALS: readonly number[] = Array.from(
  { length: SET_AWAKE_MAX_TOTAL },
  (_, index) => index + 1,
);

function statOptions(stats: readonly StatKey[]): SelectOption[] {
  return [NONE_OPTION, ...stats.map((stat) => ({ value: stat, label: stat.toUpperCase() }))];
}

function AwakeRow({
  label,
  line,
  stats,
  valueOptions,
  onStat,
  onValue,
}: {
  label: string;
  line: SetStatAwakeLine | null;
  stats: readonly StatKey[];
  valueOptions: readonly number[];
  onStat: (stat: StatKey | null) => void;
  onValue: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[92px] shrink-0">
        <Select
          label={`${label} stat`}
          value={line?.stat ?? ''}
          options={statOptions(stats)}
          size="sm"
          valueClassName="font-mono"
          onChange={(value) => {
            onStat(asStatKey(value));
          }}
        />
      </div>
      <SnapSlider
        className="min-w-0 flex-1"
        label={`${label} total`}
        options={valueOptions}
        value={line?.value ?? 0}
        disabled={line === null}
        format={formatUpgrade}
        onChange={onValue}
      />
    </div>
  );
}

/**
 * Equipment-set stat awake as overall 1–16 totals (the per-piece distribution doesn't matter). A
 * second stat appears while the first total leaves room for one; its slider snaps to the totals
 * actually reachable by distributing valid per-piece awakes over the four pieces.
 */
export function SetStatAwakeEditor({
  awake,
  onChange,
  label,
}: {
  awake: SetStatAwake;
  onChange: (awake: SetStatAwake) => void;
  label: string;
}) {
  const data = useGameData();
  const [first, second] = awake;
  const partners = first === null ? [] : setAwakePartnerOptions(data, first.stat, first.value);
  const secondTotals =
    first === null || second === null
      ? []
      : setAwakeSecondTotals(data, first.stat, first.value, second.stat).filter(
          (total) => total > 0,
        );
  const showSecond = first !== null && partners.length > 0;

  const changeFirst = (line: SetStatAwakeLine | null): void => {
    let next: SetStatAwake = [null, null];

    if (line !== null) {
      let keptSecond: SetStatAwakeLine | null = null;

      if (second !== null && second.stat !== line.stat) {
        const reachable = setAwakeSecondTotals(data, line.stat, line.value, second.stat).filter(
          (total) => total > 0,
        );
        const snapped = nearestValue(reachable, second.value);

        if (snapped !== undefined) {
          keptSecond = { stat: second.stat, value: snapped };
        }
      }

      next = [line, keptSecond];
    }

    onChange(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <AwakeRow
        label={`${label} line 1`}
        line={first}
        stats={STAT_KEYS}
        valueOptions={FIRST_TOTALS}
        onStat={(stat) => {
          changeFirst(stat === null ? null : { stat, value: first?.value ?? SET_AWAKE_MAX_TOTAL });
        }}
        onValue={(value) => {
          if (first !== null) {
            changeFirst({ stat: first.stat, value });
          }
        }}
      />
      {showSecond && (
        <AwakeRow
          label={`${label} line 2`}
          line={second}
          stats={partners}
          valueOptions={secondTotals}
          onStat={(stat) => {
            let line: SetStatAwakeLine | null = null;

            // `first` is non-null here: the row only renders while `showSecond` holds.
            if (stat !== null) {
              const reachable = setAwakeSecondTotals(data, first.stat, first.value, stat).filter(
                (total) => total > 0,
              );
              const value = reachable[reachable.length - 1];

              if (value !== undefined) {
                line = { stat, value };
              }
            }

            onChange([first, line]);
          }}
          onValue={(value) => {
            if (second !== null) {
              onChange([first, { stat: second.stat, value }]);
            }
          }}
        />
      )}
    </div>
  );
}
