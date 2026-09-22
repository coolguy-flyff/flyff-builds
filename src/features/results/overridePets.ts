import type { GameData } from '@/data';
import { displayName, petShortName, type PetEntry } from '@/domain/build';
import { resolvePetGrace } from '@/domain/engine';
import { formatAbilityList } from '@/features/buffs/effectText';
import { describePet } from '@/features/gear/listRows';

import type { OverridePet } from './viewState';

const UNSET_PET_NAME = 'Pet';

/**
 * A pet entry for the override picker: its name (or species), cage icon, granted stat and grace
 * effect — the same grace the engine applies (level = raised tiers).
 */
export function describeOverridePet(data: GameData, entry: PetEntry): OverridePet {
  const def = data.pets.find((pet) => pet.petItemId === entry.petItemId);
  const row = describePet(data, entry);
  const species = def === undefined ? UNSET_PET_NAME : petShortName(def.name);
  const grace = resolvePetGrace(data, entry).grace;

  return {
    id: entry.id,
    name: displayName(entry.customName, species),
    icon: row.icon,
    stat: row.chips[0]?.label ?? null,
    graceEffect: grace === null ? null : formatAbilityList(data, grace.abilities),
  };
}
