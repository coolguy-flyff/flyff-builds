import { getItem } from '@/data';
import { cardShortName, jewelShortName, type WeaponEntry } from '@/domain/build';
import { resolveWeaponEntry } from '@/domain/engine';
import {
  defaultStatRangeValue,
  hasRandomStats,
  piercingSlots,
  rangedAbilities,
  skillAwakeOptions,
  ultimateJewelSlots,
} from '@/domain/rules';
import { SubCard } from '@/components/Card';
import { rarityClassName } from '@/components/rarity';
import { useActions, useAppStore, useGameData } from '@/state';

import { EntryEditorShell } from '../EntryEditorShell';
import { weaponMetaLine, weaponRowMeta, weaponTypeLabel } from '../format';
import { ItemCombobox } from '../ItemCombobox';
import { RandomStatLinesEditor } from './RandomStatLinesEditor';
import { SkillAwakeSelect } from './SkillAwakeSelect';
import { StackEditor } from './StackEditor';
import { StatAwakeEditor } from './StatAwakeEditor';
import { StatRangesEditor } from './StatRangesEditor';
import { UpgradeField } from './UpgradeField';

/**
 * Weapon editor (plan A2.2): item, upgrade, stat awake, skill awake, stat ranges, ultimate random
 * stats, piercing cards and ultimate jewels. Item and upgrade changes go through the store actions
 * that re-derive dependent fields; everything else is an entry recipe.
 */
export function WeaponEditor({ entry }: { entry: WeaponEntry }) {
  const data = useGameData();
  const actions = useActions();
  const jobId = useAppStore((state) => state.build.character.jobId);
  const items = data.weaponsByJob.get(jobId) ?? [];
  const item = entry.itemId === null ? null : (getItem(data, entry.itemId) ?? null);
  const resolution = resolveWeaponEntry(data, entry, 'mainhand');
  const ultimate = item !== null && item.rarity === 'ultimate';
  const awakeOptions = item === null ? [] : skillAwakeOptions(data, item);
  const ranged = item === null ? [] : rangedAbilities(item);

  const update = (recipe: (draft: WeaponEntry) => void): void => {
    actions.updateEntry('weapons', entry.id, recipe);
  };

  return (
    <EntryEditorShell
      list="weapons"
      entry={entry}
      nameClassName={item === null ? undefined : rarityClassName(item.rarity)}
      contributions={resolution.contributions}
    >
      <SubCard label="Item">
        <ItemCombobox
          items={items}
          value={item}
          label="Weapon item"
          groupBy={weaponTypeLabel}
          rowMeta={weaponRowMeta}
          metaLine={weaponMetaLine}
          noneLabel="None (bare hands)"
          placeholder="Search weapons…"
          onChange={(next) => {
            actions.setWeaponItem(entry.id, next === null ? null : next.id);
          }}
        />
      </SubCard>
      <UpgradeField
        value={entry.upgrade}
        onChange={(upgrade) => {
          actions.setWeaponUpgrade(entry.id, upgrade);
        }}
      />
      <SubCard label="Stat awake">
        <StatAwakeEditor
          label="Weapon awake"
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
            label="Weapon skill awake"
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
      {item !== null && ranged.length > 0 && (
        <SubCard label="Stat ranges" span>
          <StatRangesEditor
            label="Weapon"
            item={item}
            values={entry.statRanges}
            onChange={(index, value) => {
              update((draft) => {
                draft.statRanges = ranged.map((ability, position) => {
                  const current = entry.statRanges[position] ?? defaultStatRangeValue(ability);

                  return position === index ? value : current;
                });
              });
            }}
          />
        </SubCard>
      )}
      {item !== null && hasRandomStats(item) && (
        <SubCard label="Ultimate random stats" span>
          <RandomStatLinesEditor
            label="Random stat"
            item={item}
            upgrade={entry.upgrade}
            lines={entry.randomStats}
            onChange={(lines) => {
              update((draft) => {
                draft.randomStats = lines;
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
      {item !== null && ultimate && (
        <StackEditor
          title="Ultimate jewels"
          noun="jewel"
          options={data.jewels}
          stacks={entry.jewels}
          capacity={ultimateJewelSlots(item, entry.upgrade)}
          shorten={jewelShortName}
          formatStatus={(used, capacity) => `${used} / ${capacity} slots at +${entry.upgrade}`}
          onChange={(stacks) => {
            update((draft) => {
              draft.jewels = stacks;
            });
          }}
        />
      )}
    </EntryEditorShell>
  );
}
