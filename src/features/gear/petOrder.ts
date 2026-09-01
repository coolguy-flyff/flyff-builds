import type { GameData, PetDef } from '@/data';

/** Tile order for the nine raised pets (plan A2.6): base stats, then attack/defense/HP, then crits. */
const PET_PARAMETER_ORDER: readonly string[] = [
  'str',
  'sta',
  'dex',
  'int',
  'attack',
  'def',
  'maxhp',
  'criticalchance',
  'criticaldamage',
];

function tileRank(def: PetDef): number {
  const index = PET_PARAMETER_ORDER.indexOf(def.parameter);

  return index === -1 ? PET_PARAMETER_ORDER.length : index;
}

export function orderedPets(data: GameData): PetDef[] {
  return [...data.pets].sort((a, b) => tileRank(a) - tileRank(b) || a.name.localeCompare(b.name));
}

export function petDefFor(data: GameData, petItemId: number | null): PetDef | undefined {
  return petItemId === null ? undefined : data.pets.find((def) => def.petItemId === petItemId);
}
