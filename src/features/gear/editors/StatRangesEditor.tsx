import { getStatName, type SlimItem } from '@/data';
import { formatStatValue } from '@/domain/build';
import { defaultStatRangeValue, rangedAbilities, statRangeBounds } from '@/domain/rules';
import { SnapSlider } from '@/components/SnapSlider';
import { useGameData } from '@/state';

import { stepValues } from '../values';

/**
 * One snapping slider per ranged ability (plan A2.2): bounded to `add…addMax`, stepped per stat,
 * with a `Max` button. Values are stored in ranged-ability order.
 */
export function StatRangesEditor({
  item,
  values,
  onChange,
  label,
}: {
  item: SlimItem;
  values: readonly number[];
  onChange: (index: number, value: number) => void;
  label: string;
}) {
  const data = useGameData();

  return (
    <div className="flex flex-col gap-2">
      {rangedAbilities(item).map((ability, index) => {
        const statName = getStatName(data, ability.parameter);
        const value = values[index] ?? defaultStatRangeValue(ability);

        return (
          <div key={`${index}-${ability.parameter}`} className="flex items-center gap-2.5">
            <span className="w-[140px] shrink-0 truncate text-[12px] text-text-2" title={statName}>
              {statName}
            </span>
            <SnapSlider
              className="min-w-0 flex-1"
              label={`${label} ${statName}`}
              options={stepValues(statRangeBounds(ability))}
              value={value}
              format={(candidate) => formatStatValue(candidate, ability.rate)}
              showMax
              onChange={(next) => {
                onChange(index, next);
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
