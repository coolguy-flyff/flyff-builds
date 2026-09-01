import type { SkillAwake } from '@/domain/build';
import type { SkillAwakeOption } from '@/domain/rules';
import { Select, type SelectGroup } from '@/components/Select';
import { Hint } from '@/components/Text';
import { useGameData } from '@/state';

import { isSkillDamageAwake, skillAwakeParameterLabel } from '../format';

function highestValue(option: SkillAwakeOption): number {
  return option.values[option.values.length - 1] ?? 0;
}

/**
 * Skill awake (plan A2.2 / A2.3): `None`, a stat-type awake (Healing %, Block %, …) or a
 * skill-damage awake for one of the weapon's skills. Picking an option defaults to its highest
 * value. Skill-damage awakes are stored for future work — they do not affect the results yet.
 */
export function SkillAwakeSelect({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly SkillAwakeOption[];
  value: SkillAwake | null;
  onChange: (awake: SkillAwake | null) => void;
  label: string;
}) {
  const data = useGameData();
  const selected =
    value === null ? undefined : options.find((option) => option.parameter === value.parameter);
  const toOption = (option: SkillAwakeOption) => ({
    value: option.parameter,
    label: skillAwakeParameterLabel(data, option.parameter),
  });
  const statOptions = options.filter((option) => !isSkillDamageAwake(option.parameter));
  const skillOptions = options.filter((option) => isSkillDamageAwake(option.parameter));
  const groups: SelectGroup[] = [];

  if (statOptions.length > 0) {
    groups.push({ label: 'Stats', options: statOptions.map(toOption) });
  }

  if (skillOptions.length > 0) {
    groups.push({ label: 'Skill damage', options: skillOptions.map(toOption) });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-[170px]">
          <Select
            label={`${label} stat`}
            value={selected?.parameter ?? ''}
            options={[{ value: '', label: 'None' }]}
            groups={groups}
            onChange={(parameter) => {
              const option = options.find((candidate) => candidate.parameter === parameter);
              onChange(
                option === undefined
                  ? null
                  : { parameter: option.parameter, value: highestValue(option) },
              );
            }}
          />
        </div>
        {selected !== undefined && value !== null && (
          <div className="w-[90px]">
            <Select
              label={`${label} value`}
              value={String(value.value)}
              options={selected.values.map((candidate) => ({
                value: String(candidate),
                label: `+${candidate}%`,
              }))}
              valueClassName="font-mono text-accent"
              onChange={(next) => {
                onChange({ parameter: selected.parameter, value: Number(next) });
              }}
            />
          </div>
        )}
      </div>
      {value !== null && isSkillDamageAwake(value.parameter) && (
        <Hint>skill damage — not applied to the results yet</Hint>
      )}
    </div>
  );
}
