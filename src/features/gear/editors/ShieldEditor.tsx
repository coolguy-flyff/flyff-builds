import { getItem } from '@/data';
import { cardShortName, type ShieldEntry } from '@/domain/build';
import { resolveShieldEntry } from '@/domain/engine';
import { piercingSlots, skillAwakeOptions } from '@/domain/rules';
import { SubCard } from '@/components/Card';
import { rarityClassName } from '@/components/rarity';
import { Hint } from '@/components/Text';
import { useActions, useAppStore, useGameData } from '@/state';

import { EntryEditorShell } from '../EntryEditorShell';
import { shieldMetaLine, shieldRowMeta } from '../format';
import { ItemCombobox } from '../ItemCombobox';
import { SkillAwakeSelect } from './SkillAwakeSelect';
import { StackEditor } from './StackEditor';
import { StatAwakeEditor } from './StatAwakeEditor';
import { UpgradeField } from './UpgradeField';

function shieldGroup(): string {
  return 'Shields';
}

/** Shield editor (plan A2.3): the weapon layout minus stat ranges, random stats and jewels. */
export function ShieldEditor({ entry }: { entry: ShieldEntry }) {
  const data = useGameData();
  const actions = useActions();
  const jobId = useAppStore((state) => state.build.character.jobId);
  const items = data.shieldsByJob.get(jobId) ?? [];
  const item = entry.itemId === null ? null : (getItem(data, entry.itemId) ?? null);
  const resolution = resolveShieldEntry(data, entry);
  const awakeOptions = item === null ? [] : skillAwakeOptions(data, item);

  const update = (recipe: (draft: ShieldEntry) => void): void => {
    actions.updateEntry('shields', entry.id, recipe);
  };

  return (
    <EntryEditorShell
      list="shields"
      entry={entry}
      nameClassName={item === null ? undefined : rarityClassName(item.rarity)}
      contributions={resolution.contributions}
    >
      <SubCard label="Item">
        <ItemCombobox
          items={items}
          value={item}
          label="Shield item"
          groupBy={shieldGroup}
          rowMeta={shieldRowMeta}
          metaLine={shieldMetaLine}
          placeholder="Search shields…"
          onChange={(next) => {
            actions.setShieldItem(entry.id, next === null ? null : next.id);
          }}
        />
      </SubCard>
      <UpgradeField
        value={entry.upgrade}
        onChange={(upgrade) => {
          update((draft) => {
            draft.upgrade = upgrade;
          });
        }}
      />
      <SubCard label="Stat awake">
        <StatAwakeEditor
          label="Shield awake"
          awake={entry.statAwake}
          onChange={(awake) => {
            update((draft) => {
              draft.statAwake = awake;
            });
          }}
        />
      </SubCard>
      {awakeOptions.length > 0 && (
        <SubCard label="Skill awake">
          <SkillAwakeSelect
            label="Shield skill awake"
            options={awakeOptions}
            value={entry.skillAwake}
            onChange={(awake) => {
              update((draft) => {
                draft.skillAwake = awake;
              });
            }}
          />
        </SubCard>
      )}
      {item !== null && (
        <StackEditor
          title="Piercing cards"
          noun="card"
          options={data.weaponCards}
          stacks={entry.cards}
          capacity={piercingSlots(item)}
          shorten={cardShortName}
          onChange={(stacks) => {
            update((draft) => {
              draft.cards = stacks;
            });
          }}
        />
      )}
      <div className="md:col-span-2">
        <Hint>
          A shield only counts in swaps whose weapon is one-handed (and never for Slayers).
        </Hint>
      </div>
    </EntryEditorShell>
  );
}
