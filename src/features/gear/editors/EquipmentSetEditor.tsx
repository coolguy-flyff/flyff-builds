import { getItem, getStatName, type ArmorSet } from '@/data';
import { cardShortName, type EquipmentSetEntry } from '@/domain/build';
import { resolveEquipmentSetEntry } from '@/domain/engine';
import { piercingSlots, upgradeBonusRow } from '@/domain/rules';
import { SubCard } from '@/components/Card';
import { EntityCombobox } from '@/components/EntityCombobox';
import { ItemIcon } from '@/components/ItemIcon';
import { Hint } from '@/components/Text';
import { useActions, useAppStore, useGameData } from '@/state';

import { EntryEditorShell } from '../EntryEditorShell';
import { armorSetLabel, armorSetTier, formatAbilityList, formatSetBonusLines } from '../format';
import { SetStatAwakeEditor } from './SetStatAwakeEditor';
import { StackEditor } from './StackEditor';
import { UpgradeField } from './UpgradeField';

const DEFAULT_SUIT_SLOTS = 4;

function setKey(set: ArmorSet): number {
  return set.id;
}

function SetOptionRow({ set }: { set: ArmorSet }) {
  const data = useGameData();
  const suit = getItem(data, set.parts.suit);

  return (
    <div className="flex items-center gap-2.5">
      {suit !== undefined && <ItemIcon icon={suit.icon} size={24} />}
      <span className="min-w-0 flex-1 truncate font-semibold">{armorSetLabel(set)}</span>
      <span className="shrink-0 font-mono text-[11px] text-muted">Lv {set.level}</span>
    </div>
  );
}

/** Equipment set editor (plan A2.1): set, common upgrade, overall stat-awake totals and suit piercing. */
export function EquipmentSetEditor({ entry }: { entry: EquipmentSetEntry }) {
  const data = useGameData();
  const actions = useActions();
  const jobId = useAppStore((state) => state.build.character.jobId);
  const sets = data.armorSetsByJob.get(jobId) ?? [];
  const set = entry.setId === null ? null : (data.armorSets.get(entry.setId) ?? null);
  const suit = set === null ? undefined : getItem(data, set.parts.suit);
  const capacity = suit === undefined ? DEFAULT_SUIT_SLOTS : piercingSlots(suit);
  const resolution = resolveEquipmentSetEntry(data, entry);
  const bonusRow = entry.upgrade > 0 ? upgradeBonusRow(data, entry.upgrade) : undefined;
  const upgradeHint =
    bonusRow === undefined || bonusRow.setAbilities.length === 0
      ? 'Set upgrade bonus starts at +3'
      : `Set upgrade bonus at +${entry.upgrade}: ${formatAbilityList(data, bonusRow.setAbilities)}`;

  const setSearchText = (candidate: ArmorSet): string => {
    const stats = candidate.bonus.map((line) => getStatName(data, line.ability.parameter));

    return `${candidate.name} ${armorSetLabel(candidate)} ${armorSetTier(candidate)} ${stats.join(' ')}`;
  };

  const update = (recipe: (draft: EquipmentSetEntry) => void): void => {
    actions.updateEntry('equipmentSets', entry.id, recipe);
  };

  return (
    <EntryEditorShell list="equipmentSets" entry={entry} contributions={resolution.contributions}>
      <SubCard label="Set" note="4 pieces, worn together">
        <EntityCombobox
          options={sets}
          value={set}
          getKey={setKey}
          getLabel={armorSetLabel}
          getSearchText={setSearchText}
          groupBy={armorSetTier}
          renderOption={(option) => <SetOptionRow set={option} />}
          leading={suit === undefined ? undefined : <ItemIcon icon={suit.icon} size={26} />}
          meta={set === null ? undefined : `Lv ${set.level}`}
          placeholder="Pick a set…"
          allowNone
          label="Equipment set"
          onChange={(next) => {
            actions.setEquipmentSet(entry.id, next === null ? null : next.id);
          }}
        />
        <Hint className="mt-1.5">
          {set === null
            ? 'Pick a set to see its 4-piece bonuses'
            : formatSetBonusLines(data, set.bonus)}
        </Hint>
      </SubCard>
      <UpgradeField
        note="all four pieces"
        value={entry.upgrade}
        hint={upgradeHint}
        onChange={(upgrade) => {
          update((draft) => {
            draft.upgrade = upgrade;
          });
        }}
      />
      <SubCard label="Stat awake" note="overall bonus across all 4 pieces">
        <SetStatAwakeEditor
          label="Equipment set awake"
          awake={entry.statAwake}
          onChange={(awake) => {
            update((draft) => {
              draft.statAwake = awake;
            });
          }}
        />
      </SubCard>
      <StackEditor
        title="Suit piercing"
        note="element upgrades are not modeled"
        noun="card"
        options={data.suitCards}
        stacks={entry.suitCards}
        capacity={capacity}
        shorten={cardShortName}
        onChange={(stacks) => {
          update((draft) => {
            draft.suitCards = stacks;
          });
        }}
      />
    </EntryEditorShell>
  );
}
