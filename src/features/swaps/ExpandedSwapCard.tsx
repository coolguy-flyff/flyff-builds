import type { ReactNode } from 'react';

import { issuesFor, type GearSwap } from '@/domain/build';
import { Card } from '@/components/Card';
import { EditorActions } from '@/components/EditorFrame';
import { InlineName } from '@/components/InlineName';
import { rarityClassName } from '@/components/rarity';
import { Select } from '@/components/Select';
import { DragHandle } from '@/components/Sortable';
import { FieldLabel, Hint } from '@/components/Text';
import { Toggle } from '@/components/Toggle';
import { useSortableItem } from '@/components/useSortableItem';
import { cx } from '@/lib/cx';
import { useActions, useBuild, useGameData, useSelectors } from '@/state';

import { SwapChips } from './SwapChips';
import {
  compositionChips,
  entryOptions,
  fromSelectValue,
  mainhandItem,
  maskGroups,
  NONE_OPTION,
  offhandFromValue,
  offhandModel,
  toSelectValue,
  type EntryNamer,
} from './swapModel';

/** Swap slots that hold an optional entry or item id. */
type NullableSlot = keyof Pick<
  GearSwap,
  'equipmentSetId' | 'accessorySetId' | 'weaponId' | 'fashionSetId' | 'petId' | 'maskItemId'
>;

const OFFHAND_ISSUE = 'offhand-ignored';
const STAT_PAGE_ISSUE = 'swap-stat-page-invalid';

function SwapField({
  id,
  label,
  caption,
  error,
  children,
}: {
  id: string;
  label: string;
  caption?: string | null | undefined;
  error?: string | undefined;
  children: ReactNode;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {children}
      {caption !== undefined && caption !== null && <Hint>{caption}</Hint>}
      {error !== undefined && <Hint tone="danger">{error}</Hint>}
    </div>
  );
}

/** The expanded swap editor (plan A3.2 / D5): name, actions and the eight slot selects. */
export function ExpandedSwapCard({ swap }: { swap: GearSwap }) {
  const data = useGameData();
  const build = useBuild();
  const actions = useActions();
  const selectors = useSelectors();
  const nameOf: EntryNamer = (list, id) => selectors.entryName(build, list, id);
  const issues = issuesFor(selectors.issues(build), 'gearSwaps', swap.id);
  const offhand = offhandModel(data, build, swap, nameOf);
  const weaponItem = mainhandItem(data, build, swap);
  const { attachNode, shiftStyle, isDragging, handle } = useSortableItem(
    swap.id,
    nameOf('gearSwaps', swap.id),
  );
  const onlySwap = build.gearSwaps.length === 1;
  const statPageError = issues.find((issue) => issue.code === STAT_PAGE_ISSUE)?.message;
  const offhandError = issues.find((issue) => issue.code === OFFHAND_ISSUE)?.message;

  const fieldId = (slot: string): string => `swap-${swap.id}-${slot}`;

  const update = (recipe: (draft: GearSwap) => void): void => {
    actions.updateEntry('gearSwaps', swap.id, recipe);
  };

  const setSlot = (slot: NullableSlot, value: string): void => {
    update((draft) => {
      draft[slot] = fromSelectValue(value);
    });
  };

  const expand = (id: number | undefined): void => {
    if (id !== undefined) {
      actions.setExpandedSwap(id);
    }
  };

  return (
    <Card
      ref={attachNode}
      style={shiftStyle}
      selected
      padding="editor"
      className={cx(
        'animate-card-in flex flex-col gap-3.5',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <DragHandle handle={handle} />
        <InlineName
          customName={swap.customName}
          autoName={selectors.autoName(build, 'gearSwaps', swap)}
          onChange={(name) => {
            actions.setCustomName('gearSwaps', swap.id, name);
          }}
          nameClassName="text-[14px] text-accent"
        />
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <span className="text-[11.5px] text-text-2">In results</span>
          <Toggle
            label="In results"
            checked={swap.includeInResults}
            onChange={(value) => {
              update((draft) => {
                draft.includeInResults = value;
              });
            }}
          />
          <EditorActions
            onDuplicate={() => {
              expand(actions.duplicateEntry('gearSwaps', swap.id));
            }}
            onDelete={() => {
              actions.removeEntry('gearSwaps', swap.id);
            }}
            deleteDisabled={onlySwap}
            deleteTitle={onlySwap ? 'At least one swap is required' : undefined}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <SwapField id={fieldId('equipment')} label="Equipment set">
          <Select
            id={fieldId('equipment')}
            label="Equipment set"
            value={toSelectValue(swap.equipmentSetId)}
            options={entryOptions(build, 'equipmentSets', nameOf, true)}
            onChange={(value) => {
              setSlot('equipmentSetId', value);
            }}
          />
        </SwapField>
        <SwapField
          id={fieldId('weapon')}
          label="Weapon"
          caption={swap.weaponId === null ? 'bare hands' : null}
        >
          <Select
            id={fieldId('weapon')}
            label="Weapon"
            value={toSelectValue(swap.weaponId)}
            options={entryOptions(build, 'weapons', nameOf, true)}
            valueClassName={weaponItem === null ? undefined : rarityClassName(weaponItem.rarity)}
            onChange={(value) => {
              setSlot('weaponId', value);
            }}
          />
        </SwapField>
        <SwapField
          id={fieldId('offhand')}
          label="Offhand"
          caption={offhand.caption}
          error={offhandError}
        >
          <Select
            id={fieldId('offhand')}
            label="Offhand"
            value={offhand.value}
            options={offhand.options}
            disabled={offhand.disabled}
            invalid={offhand.mismatch}
            onChange={(value) => {
              update((draft) => {
                draft.offhand = offhandFromValue(offhand.kind, value);
              });
            }}
          />
        </SwapField>
        <SwapField id={fieldId('accessory')} label="Accessory set">
          <Select
            id={fieldId('accessory')}
            label="Accessory set"
            value={toSelectValue(swap.accessorySetId)}
            options={entryOptions(build, 'accessorySets', nameOf, true)}
            onChange={(value) => {
              setSlot('accessorySetId', value);
            }}
          />
        </SwapField>
        <SwapField id={fieldId('fashion')} label="Fashion set">
          <Select
            id={fieldId('fashion')}
            label="Fashion set"
            value={toSelectValue(swap.fashionSetId)}
            options={entryOptions(build, 'fashionSets', nameOf, true)}
            onChange={(value) => {
              setSlot('fashionSetId', value);
            }}
          />
        </SwapField>
        <SwapField id={fieldId('pet')} label="Pet">
          <Select
            id={fieldId('pet')}
            label="Pet"
            value={toSelectValue(swap.petId)}
            options={entryOptions(build, 'pets', nameOf, true)}
            onChange={(value) => {
              setSlot('petId', value);
            }}
          />
        </SwapField>
        <SwapField id={fieldId('mask')} label="Mask">
          <Select
            id={fieldId('mask')}
            label="Mask"
            value={toSelectValue(swap.maskItemId)}
            options={[NONE_OPTION]}
            groups={maskGroups(data)}
            onChange={(value) => {
              setSlot('maskItemId', value);
            }}
          />
        </SwapField>
        <SwapField id={fieldId('page')} label="Stat page" error={statPageError}>
          <Select
            id={fieldId('page')}
            label="Stat page"
            value={toSelectValue(swap.statPageId)}
            options={entryOptions(build, 'statPages', nameOf, false)}
            invalid={statPageError !== undefined}
            onChange={(value) => {
              const pageId = fromSelectValue(value);

              if (pageId !== null) {
                update((draft) => {
                  draft.statPageId = pageId;
                });
              }
            }}
          />
        </SwapField>
      </div>
      <SwapChips chips={compositionChips(data, build, swap, nameOf)} />
    </Card>
  );
}
