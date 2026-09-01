import { getItem, type SlimItem } from '@/data';
import { MAX_FASHION_SPEED_PERCENT, type FashionSetEntry } from '@/domain/build';
import { resolveFashionSetEntry } from '@/domain/engine';
import { SubCard } from '@/components/Card';
import { EntityCombobox } from '@/components/EntityCombobox';
import { ItemIcon } from '@/components/ItemIcon';
import { SnapSlider } from '@/components/SnapSlider';
import { useActions, useGameData } from '@/state';

import { EntryEditorShell } from '../EntryEditorShell';
import { formatAbilityList, itemSearchText } from '../format';
import { ItemOptionRow } from '../ItemOptionRow';
import { stepValues } from '../values';
import { BlessingLinesEditor } from './BlessingLinesEditor';

const SPEED_OPTIONS = stepValues({ min: 0, max: MAX_FASHION_SPEED_PERCENT, step: 1 });

function itemKey(item: SlimItem): number {
  return item.id;
}

function itemName(item: SlimItem): string {
  return item.name;
}

function formatSpeed(value: number): string {
  return `+${value}%`;
}

/** Fashion set editor (plan A2.5): set speed, cloak and blessing lines. */
export function FashionSetEditor({ entry }: { entry: FashionSetEntry }) {
  const data = useGameData();
  const actions = useActions();
  const cloak = entry.cloakItemId === null ? null : (getItem(data, entry.cloakItemId) ?? null);
  const resolution = resolveFashionSetEntry(data, entry);

  const update = (recipe: (draft: FashionSetEntry) => void): void => {
    actions.updateEntry('fashionSets', entry.id, recipe);
  };

  return (
    <EntryEditorShell list="fashionSets" entry={entry} contributions={resolution.contributions}>
      <SubCard label="Set speed">
        <SnapSlider
          label="Fashion set speed"
          options={SPEED_OPTIONS}
          value={entry.speedPercent}
          format={formatSpeed}
          onChange={(speed) => {
            update((draft) => {
              draft.speedPercent = speed;
            });
          }}
        />
      </SubCard>
      <SubCard label="Cloak">
        <EntityCombobox
          options={data.cloaks}
          value={cloak}
          getKey={itemKey}
          getLabel={itemName}
          getSearchText={(item) => itemSearchText(data, item)}
          renderOption={(item) => (
            <ItemOptionRow
              item={item}
              meta={[]}
              abilities={formatAbilityList(data, item.abilities)}
            />
          )}
          leading={cloak === null ? undefined : <ItemIcon icon={cloak.icon} size={26} />}
          meta={cloak === null ? undefined : formatAbilityList(data, cloak.abilities)}
          placeholder="None — search cloaks…"
          allowNone
          label="Cloak"
          onChange={(next) => {
            update((draft) => {
              draft.cloakItemId = next === null ? null : next.id;
            });
          }}
        />
      </SubCard>
      <BlessingLinesEditor
        lines={entry.blessings}
        hasCloak={entry.cloakItemId !== null}
        onChange={(lines) => {
          update((draft) => {
            draft.blessings = lines;
          });
        }}
      />
    </EntryEditorShell>
  );
}
