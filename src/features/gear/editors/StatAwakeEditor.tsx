import { STAT_KEYS, type StatKey } from '@/data';
import type { StatAwake, StatAwakeLine } from '@/domain/build';
import { statAwakePartnerOptions, statAwakeValueOptions } from '@/domain/rules';
import { Select, type SelectOption } from '@/components/Select';
import { SnapSlider } from '@/components/SnapSlider';
import { useGameData } from '@/state';

import { asStatKey, formatUpgrade } from '../format';
import { normalizeStatAwake, type AwakePriority } from './statAwakeEditing';

const NONE_OPTION: SelectOption = { value: '', label: 'None' };

/** A single +4 awake fills the whole item — no room for a partner line. */
const MAX_SINGLE_AWAKE = 4;

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
  line: StatAwakeLine | null;
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
        label={`${label} value`}
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
 * Stat awake rows for weapons and shields (plan A2.2): a stat select plus a snapping slider per
 * line. The second line appears only while a partner is possible (first value below +4) and offers
 * only valid partners; every change is normalised against the awake table so an invalid awake is
 * unreachable.
 */
export function StatAwakeEditor({
  awake,
  onChange,
  label,
}: {
  awake: StatAwake;
  onChange: (awake: StatAwake) => void;
  label: string;
}) {
  const data = useGameData();
  const [first, second] = awake;
  const partners = first === null ? [] : statAwakePartnerOptions(data, first.stat);
  const firstValues = first === null ? [] : statAwakeValueOptions(data, first.stat, null);
  const secondValues =
    first === null || second === null ? [] : statAwakeValueOptions(data, second.stat, first);
  const showSecond = first !== null && first.value < MAX_SINGLE_AWAKE && partners.length > 0;

  const commit = (
    nextFirst: StatAwakeLine | null,
    nextSecond: StatAwakeLine | null,
    priority: AwakePriority,
  ): void => {
    onChange(normalizeStatAwake(data, nextFirst, nextSecond, priority));
  };

  return (
    <div className="flex flex-col gap-2">
      <AwakeRow
        label={`${label} line 1`}
        line={first}
        stats={STAT_KEYS}
        valueOptions={firstValues}
        onStat={(stat) => {
          commit(stat === null ? null : { stat, value: first?.value ?? 1 }, second, 'first');
        }}
        onValue={(value) => {
          if (first !== null) {
            const nextFirst = { stat: first.stat, value };
            const keepSecond =
              second !== null &&
              statAwakeValueOptions(data, second.stat, nextFirst).length > 0 &&
              value < MAX_SINGLE_AWAKE
                ? second
                : null;

            commit(nextFirst, keepSecond, 'first');
          }
        }}
      />
      {showSecond && (
        <AwakeRow
          label={`${label} line 2`}
          line={second}
          stats={partners}
          valueOptions={secondValues}
          onStat={(stat) => {
            commit(first, stat === null ? null : { stat, value: second?.value ?? 1 }, 'second');
          }}
          onValue={(value) => {
            if (second !== null) {
              commit(first, { stat: second.stat, value }, 'second');
            }
          }}
        />
      )}
    </div>
  );
}
