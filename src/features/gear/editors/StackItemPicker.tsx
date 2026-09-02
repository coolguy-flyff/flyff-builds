import { useEffect, useRef } from 'react';

import type { SlimItem } from '@/data';
import { EntityCombobox } from '@/components/EntityCombobox';
import { ItemIcon } from '@/components/ItemIcon';
import { useGameData } from '@/state';

import { formatAbilityList, itemSearchText } from '../format';
import { stackFamily } from './stacks';

function itemKey(item: SlimItem): number {
  return item.id;
}

/** Card / jewel picker grouped by family; the query matches names, families and stat names. */
export function StackItemPicker({
  options,
  value,
  onChange,
  label,
  shorten,
  allowNone = false,
  noneLabel,
  autoFocus = false,
}: {
  options: readonly SlimItem[];
  value: SlimItem | null;
  onChange: (item: SlimItem | null) => void;
  label: string;
  shorten: (name: string) => string;
  allowNone?: boolean | undefined;
  noneLabel?: string | undefined;
  autoFocus?: boolean | undefined;
}) {
  const data = useGameData();
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoFocus) {
      wrapper.current?.querySelector('input')?.focus();
    }
  }, [autoFocus]);

  return (
    <div ref={wrapper}>
      <EntityCombobox
        options={options}
        value={value}
        onChange={onChange}
        getKey={itemKey}
        getLabel={(item) => shorten(item.name)}
        getSearchText={(item) => `${itemSearchText(data, item)} ${stackFamily(item.name)}`}
        groupBy={(item) => stackFamily(item.name)}
        renderOption={(item) => (
          <div className="flex items-center gap-2">
            <ItemIcon icon={item.icon} size={22} />
            <div className="min-w-0 flex-1">
              <div className="truncate">{item.name}</div>
              <div className="font-mono text-[10.5px] break-words text-accent">
                {formatAbilityList(data, item.abilities)}
              </div>
            </div>
          </div>
        )}
        leading={value === null ? undefined : <ItemIcon icon={value.icon} size={22} />}
        placeholder="Search by name or stat…"
        allowNone={allowNone}
        noneLabel={noneLabel}
        label={label}
      />
    </div>
  );
}
