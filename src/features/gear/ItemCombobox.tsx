import type { SlimItem } from '@/data';
import { EntityCombobox } from '@/components/EntityCombobox';
import { ItemIcon } from '@/components/ItemIcon';
import { rarityClassName } from '@/components/rarity';
import { Hint } from '@/components/Text';
import { useGameData } from '@/state';

import { formatAbilityList, itemSearchText } from './format';
import { ItemOptionRow } from './ItemOptionRow';

function itemKey(item: SlimItem): number {
  return item.id;
}

function itemName(item: SlimItem): string {
  return item.name;
}

/**
 * Searchable item picker for weapons and shields (plan A2.2 / A2.3): grouped rows with icon,
 * rarity-coloured name, tags and ability preview; the query matches names and stat names.
 */
export function ItemCombobox({
  items,
  value,
  onChange,
  label,
  groupBy,
  rowMeta,
  metaLine,
  hint,
  noneLabel,
  placeholder = 'Search items…',
}: {
  items: readonly SlimItem[];
  value: SlimItem | null;
  onChange: (item: SlimItem | null) => void;
  label: string;
  groupBy: (item: SlimItem) => string;
  /** Tags shown next to the name in an option row (level, hand, attack …). */
  rowMeta: (item: SlimItem) => readonly string[];
  /** Meta line under the selected value. */
  metaLine: (item: SlimItem) => string;
  hint?: string | undefined;
  noneLabel?: string | undefined;
  placeholder?: string | undefined;
}) {
  const data = useGameData();

  return (
    <>
      <EntityCombobox
        options={items}
        value={value}
        onChange={onChange}
        getKey={itemKey}
        getLabel={itemName}
        getSearchText={(item) => `${itemSearchText(data, item)} ${groupBy(item)}`}
        groupBy={groupBy}
        renderOption={(item) => (
          <ItemOptionRow
            item={item}
            meta={rowMeta(item)}
            abilities={formatAbilityList(data, item.abilities)}
          />
        )}
        leading={value === null ? undefined : <ItemIcon icon={value.icon} size={26} />}
        meta={value === null ? undefined : metaLine(value)}
        inputClassName={value === null ? undefined : rarityClassName(value.rarity)}
        placeholder={placeholder}
        allowNone
        noneLabel={noneLabel ?? 'None'}
        label={label}
      />
      {hint !== undefined && <Hint className="mt-1.5">{hint}</Hint>}
    </>
  );
}
