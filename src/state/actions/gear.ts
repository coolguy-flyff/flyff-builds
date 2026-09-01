import { getItem } from '@/data';
import { trimStacks, withShieldItem, withWeaponItem, withWeaponUpgrade } from '@/domain/build';
import { piercingSlots } from '@/domain/rules';

import type { ActionContext } from './shared';

export interface GearActions {
  setWeaponItem(id: number, itemId: number | null): void;
  setWeaponUpgrade(id: number, upgrade: number): void;
  setShieldItem(id: number, itemId: number | null): void;
  setEquipmentSet(id: number, setId: number | null): void;
}

export function createGearActions({ set, deps }: ActionContext): GearActions {
  return {
    setWeaponItem(id, itemId) {
      set((draft) => {
        const index = draft.build.weapons.findIndex((entry) => entry.id === id);
        const entry = draft.build.weapons[index];

        if (entry !== undefined) {
          draft.build.weapons[index] = withWeaponItem(deps.data, entry, itemId);
        }
      });
    },

    setWeaponUpgrade(id, upgrade) {
      set((draft) => {
        const index = draft.build.weapons.findIndex((entry) => entry.id === id);
        const entry = draft.build.weapons[index];

        if (entry !== undefined) {
          draft.build.weapons[index] = withWeaponUpgrade(deps.data, entry, upgrade);
        }
      });
    },

    setShieldItem(id, itemId) {
      set((draft) => {
        const index = draft.build.shields.findIndex((entry) => entry.id === id);
        const entry = draft.build.shields[index];

        if (entry !== undefined) {
          draft.build.shields[index] = withShieldItem(deps.data, entry, itemId);
        }
      });
    },

    setEquipmentSet(id, setId) {
      set((draft) => {
        const entry = draft.build.equipmentSets.find((candidate) => candidate.id === id);

        if (entry === undefined) {
          return;
        }

        entry.setId = setId;
        const suit = setId === null ? undefined : deps.data.armorSets.get(setId)?.parts.suit;
        const suitItem = suit === undefined ? undefined : getItem(deps.data, suit);
        const capacity = suitItem === undefined ? 4 : piercingSlots(suitItem);
        entry.suitCards = trimStacks(entry.suitCards, capacity);
      });
    },
  };
}
