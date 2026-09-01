import type { BuildState, GearSwap } from './schema';

export interface DanglingReference {
  readonly swapId: number;
  readonly slot: keyof Pick<
    GearSwap,
    | 'statPageId'
    | 'equipmentSetId'
    | 'accessorySetId'
    | 'weaponId'
    | 'offhand'
    | 'fashionSetId'
    | 'petId'
  >;
  readonly missingId: number;
}

export interface ReferenceRepair {
  readonly build: BuildState;
  readonly dangling: readonly DanglingReference[];
}

function idSet(entries: readonly { id: number }[]): Set<number> {
  return new Set(entries.map((entry) => entry.id));
}

/**
 * Nulls swap slots that point at entries which no longer exist and falls back to the first stat
 * page. Swaps are never deleted by this repair. Returns the same object when nothing changed.
 */
export function repairReferences(build: BuildState): ReferenceRepair {
  const pages = idSet(build.statPages);
  const equipment = idSet(build.equipmentSets);
  const accessories = idSet(build.accessorySets);
  const weapons = idSet(build.weapons);
  const shields = idSet(build.shields);
  const fashion = idSet(build.fashionSets);
  const pets = idSet(build.pets);
  const firstPage = build.statPages[0];
  const dangling: DanglingReference[] = [];

  const swaps = build.gearSwaps.map((swap) => {
    const next: GearSwap = { ...swap };

    if (!pages.has(swap.statPageId) && firstPage !== undefined) {
      dangling.push({ swapId: swap.id, slot: 'statPageId', missingId: swap.statPageId });
      next.statPageId = firstPage.id;
    }

    if (swap.equipmentSetId !== null && !equipment.has(swap.equipmentSetId)) {
      dangling.push({ swapId: swap.id, slot: 'equipmentSetId', missingId: swap.equipmentSetId });
      next.equipmentSetId = null;
    }

    if (swap.accessorySetId !== null && !accessories.has(swap.accessorySetId)) {
      dangling.push({ swapId: swap.id, slot: 'accessorySetId', missingId: swap.accessorySetId });
      next.accessorySetId = null;
    }

    if (swap.weaponId !== null && !weapons.has(swap.weaponId)) {
      dangling.push({ swapId: swap.id, slot: 'weaponId', missingId: swap.weaponId });
      next.weaponId = null;
    }

    if (swap.offhand !== null) {
      const exists =
        swap.offhand.kind === 'shield'
          ? shields.has(swap.offhand.id)
          : weapons.has(swap.offhand.id);

      if (!exists) {
        dangling.push({ swapId: swap.id, slot: 'offhand', missingId: swap.offhand.id });
        next.offhand = null;
      }
    }

    if (swap.fashionSetId !== null && !fashion.has(swap.fashionSetId)) {
      dangling.push({ swapId: swap.id, slot: 'fashionSetId', missingId: swap.fashionSetId });
      next.fashionSetId = null;
    }

    if (swap.petId !== null && !pets.has(swap.petId)) {
      dangling.push({ swapId: swap.id, slot: 'petId', missingId: swap.petId });
      next.petId = null;
    }

    const swapChanged = Object.keys(next).some(
      (key) => next[key as keyof GearSwap] !== swap[key as keyof GearSwap],
    );

    return swapChanged ? next : swap;
  });
  const changed = swaps.some((swap, index) => swap !== build.gearSwaps[index]);

  return { build: changed ? { ...build, gearSwaps: swaps } : build, dangling };
}

/** Gear swaps referencing the entry (any slot). */
export function swapsReferencing(build: BuildState, listKey: string, entryId: number): GearSwap[] {
  return build.gearSwaps.filter((swap) => {
    let referenced = false;

    switch (listKey) {
      case 'statPages':
        referenced = swap.statPageId === entryId;
        break;
      case 'equipmentSets':
        referenced = swap.equipmentSetId === entryId;
        break;
      case 'accessorySets':
        referenced = swap.accessorySetId === entryId;
        break;
      case 'weapons':
        referenced =
          swap.weaponId === entryId ||
          (swap.offhand?.kind === 'weapon' && swap.offhand.id === entryId);
        break;
      case 'shields':
        referenced = swap.offhand?.kind === 'shield' && swap.offhand.id === entryId;
        break;
      case 'fashionSets':
        referenced = swap.fashionSetId === entryId;
        break;
      case 'pets':
        referenced = swap.petId === entryId;
        break;
      default:
        break;
    }

    return referenced;
  });
}
