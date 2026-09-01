import { LIMITS, swapsReferencing, type AnyEntry, type GearListKey } from '@/domain/build';
import { useActions, useBuild, useSelectors } from '@/state';

import { plural } from './format';
import { GEAR_CATEGORIES, gearEntries } from './gearCategories';

export interface EntryActions {
  readonly name: string;
  readonly autoName: string;
  /** "in 2 swaps" */
  readonly usage: string;
  /** Names of the swaps using the entry, for the usage tooltip. */
  readonly usageTitle: string;
  readonly canMoveUp: boolean;
  readonly canMoveDown: boolean;
  readonly atLimit: boolean;
  rename(name: string | undefined): void;
  duplicate(): void;
  moveUp(): void;
  moveDown(): void;
  /** Deletes directly, or asks for confirmation first when swaps reference the entry (plan A2.0). */
  remove(): void;
}

export function useEntryActions(list: GearListKey, entry: AnyEntry): EntryActions {
  const build = useBuild();
  const actions = useActions();
  const selectors = useSelectors();
  const spec = GEAR_CATEGORIES[list];
  const entries = gearEntries(build, list);
  const index = entries.findIndex((candidate) => candidate.id === entry.id);
  const name = selectors.entryName(build, list, entry.id);
  const swaps = swapsReferencing(build, list, entry.id);

  const remove = (): void => {
    if (swaps.length === 0) {
      actions.removeEntry(list, entry.id);
    } else {
      actions.openDialog({
        kind: 'confirm',
        title: `Delete ${name}?`,
        message: `Used by ${plural(swaps.length, 'swap')} — their ${spec.slotNoun} will become empty and those swaps flagged.`,
        confirmLabel: `Delete ${spec.noun}`,
        danger: true,
        onConfirm: () => {
          actions.removeEntry(list, entry.id);
        },
      });
    }
  };

  return {
    name,
    autoName: selectors.autoName(build, list, entry),
    usage: `in ${plural(swaps.length, 'swap')}`,
    usageTitle: swaps.map((swap) => selectors.entryName(build, 'gearSwaps', swap.id)).join(', '),
    canMoveUp: index > 0,
    canMoveDown: index >= 0 && index < entries.length - 1,
    atLimit: entries.length >= LIMITS.entriesPerList,
    rename(next) {
      actions.setCustomName(list, entry.id, next);
    },
    duplicate() {
      actions.duplicateEntry(list, entry.id);
    },
    moveUp() {
      actions.moveEntry(list, entry.id, -1);
    },
    moveDown() {
      actions.moveEntry(list, entry.id, 1);
    },
    remove,
  };
}
