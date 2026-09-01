import type { ReactNode } from 'react';

import type { GearListKey } from '@/domain/build';
import { useBuild } from '@/state';

import { AccessorySetEditor } from './editors/AccessorySetEditor';
import { EquipmentSetEditor } from './editors/EquipmentSetEditor';
import { FashionSetEditor } from './editors/FashionSetEditor';
import { PetEditor } from './editors/PetEditor';
import { ShieldEditor } from './editors/ShieldEditor';
import { WeaponEditor } from './editors/WeaponEditor';

/** Routes an entry id to its typed editor; renders nothing when the entry no longer exists. */
export function GearEditor({ category, entryId }: { category: GearListKey; entryId: number }) {
  const build = useBuild();
  let editor: ReactNode = null;

  switch (category) {
    case 'equipmentSets': {
      const entry = build.equipmentSets.find((candidate) => candidate.id === entryId);
      editor = entry === undefined ? null : <EquipmentSetEditor entry={entry} />;
      break;
    }

    case 'weapons': {
      const entry = build.weapons.find((candidate) => candidate.id === entryId);
      editor = entry === undefined ? null : <WeaponEditor entry={entry} />;
      break;
    }

    case 'shields': {
      const entry = build.shields.find((candidate) => candidate.id === entryId);
      editor = entry === undefined ? null : <ShieldEditor entry={entry} />;
      break;
    }

    case 'accessorySets': {
      const entry = build.accessorySets.find((candidate) => candidate.id === entryId);
      editor = entry === undefined ? null : <AccessorySetEditor entry={entry} />;
      break;
    }

    case 'fashionSets': {
      const entry = build.fashionSets.find((candidate) => candidate.id === entryId);
      editor = entry === undefined ? null : <FashionSetEditor entry={entry} />;
      break;
    }

    case 'pets': {
      const entry = build.pets.find((candidate) => candidate.id === entryId);
      editor = entry === undefined ? null : <PetEditor entry={entry} />;
      break;
    }
  }

  return editor;
}
