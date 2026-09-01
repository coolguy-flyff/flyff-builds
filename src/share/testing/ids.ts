import type { BuildState, GearSwap, Offhand } from '@/domain/build/schema';
import { requireDefined } from '@/lib/assert';

/**
 * Test oracle for "equal modulo ids": renumbers every entry 1..n in the decoder's encounter order
 * (pages, equipment sets, weapons, shields, accessory sets, fashion sets, pets, swaps), remaps swap
 * references accordingly and sets `nextId`. Written independently of the codec so a symmetric
 * encoder/decoder bug cannot hide behind it.
 */
export function renumberIds(build: BuildState): BuildState {
  const mapping = new Map<number, number>();
  let next = 1;

  const renumber = <T extends { id: number }>(entries: readonly T[]): T[] =>
    entries.map((entry) => {
      const id = next;
      next += 1;
      mapping.set(entry.id, id);

      return { ...entry, id };
    });

  const mapped = (id: number): number =>
    requireDefined(mapping.get(id), `entry ${id} is not referenced by any list`);
  const mappedOptional = (id: number | null): number | null => (id === null ? null : mapped(id));
  const mappedOffhand = (offhand: Offhand): Offhand =>
    offhand === null ? null : { kind: offhand.kind, id: mapped(offhand.id) };

  const statPages = renumber(build.statPages);
  const equipmentSets = renumber(build.equipmentSets);
  const weapons = renumber(build.weapons);
  const shields = renumber(build.shields);
  const accessorySets = renumber(build.accessorySets);
  const fashionSets = renumber(build.fashionSets);
  const pets = renumber(build.pets);
  const gearSwaps = renumber(build.gearSwaps).map((swap): GearSwap => ({
    ...swap,
    statPageId: mapped(swap.statPageId),
    equipmentSetId: mappedOptional(swap.equipmentSetId),
    accessorySetId: mappedOptional(swap.accessorySetId),
    weaponId: mappedOptional(swap.weaponId),
    offhand: mappedOffhand(swap.offhand),
    fashionSetId: mappedOptional(swap.fashionSetId),
    petId: mappedOptional(swap.petId),
  }));

  return {
    ...build,
    nextId: next,
    statPages,
    equipmentSets,
    weapons,
    shields,
    accessorySets,
    fashionSets,
    pets,
    gearSwaps,
  };
}
