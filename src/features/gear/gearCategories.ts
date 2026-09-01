import type { AnyEntry, BuildState, GearListKey } from '@/domain/build';

export interface GearCategorySpec {
  /** Pill and list label ("Weapons"). */
  readonly label: string;
  /** Singular noun for buttons and dialogs ("weapon"). */
  readonly noun: string;
  /** The swap slot the list feeds ("their offhand will become empty"). */
  readonly slotNoun: string;
  readonly emptyHint: string;
}

/** The six gear lists in category-row order (plan A2). */
export const GEAR_CATEGORIES: Readonly<Record<GearListKey, GearCategorySpec>> = {
  equipmentSets: {
    label: 'Equipment sets',
    noun: 'equipment set',
    slotNoun: 'equipment set',
    emptyHint: 'No equipment sets yet — add one and pick a set for your job.',
  },
  weapons: {
    label: 'Weapons',
    noun: 'weapon',
    slotNoun: 'weapon',
    emptyHint: 'No weapons yet — add one to compare it across swaps.',
  },
  shields: {
    label: 'Shields',
    noun: 'shield',
    slotNoun: 'offhand',
    emptyHint: 'No shields yet — shields pair with one-handed weapons.',
  },
  accessorySets: {
    label: 'Accessory sets',
    noun: 'accessory set',
    slotNoun: 'accessory set',
    emptyHint: 'No accessory sets yet — add one and set the piece upgrades.',
  },
  fashionSets: {
    label: 'Fashion sets',
    noun: 'fashion set',
    slotNoun: 'fashion set',
    emptyHint: 'No fashion sets yet — add one for set speed, blessings and a cloak.',
  },
  pets: {
    label: 'Raised pets',
    noun: 'pet',
    slotNoun: 'pet',
    emptyHint: 'No raised pets yet — add one and choose its stat and total.',
  },
};

export function addLabelFor(list: GearListKey): string {
  return `+ Add ${GEAR_CATEGORIES[list].noun}`;
}

/** The gear lists are heterogeneous; this widens one to the entry union for generic list code. */
export function gearEntries(build: BuildState, list: GearListKey): readonly AnyEntry[] {
  return build[list];
}
