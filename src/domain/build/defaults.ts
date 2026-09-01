import { CLASS_IDS, type GameData, requireClass } from '@/data';

import {
  BUILD_SCHEMA_VERSION,
  MIN_BASE_STAT,
  type AccessorySetEntry,
  type BuildState,
  type EquipmentSetEntry,
  type FashionSetEntry,
  type GearSwap,
  type PetEntry,
  type ShieldEntry,
  type StatPage,
  type WeaponEntry,
} from './schema';

export const DEFAULT_JOB_ID = CLASS_IDS.seraph;

export function createStatPage(id: number): StatPage {
  return { id, str: MIN_BASE_STAT, sta: MIN_BASE_STAT, dex: MIN_BASE_STAT, int: MIN_BASE_STAT };
}

export function createEquipmentSetEntry(id: number, setId: number | null): EquipmentSetEntry {
  return { id, setId, upgrade: 0, statAwake: [null, null], suitCards: [] };
}

export function createWeaponEntry(id: number): WeaponEntry {
  return {
    id,
    itemId: null,
    upgrade: 0,
    statAwake: [null, null],
    skillAwake: null,
    cards: [],
    jewels: [],
    statRanges: [],
    randomStats: [],
  };
}

export function createShieldEntry(id: number): ShieldEntry {
  return { id, itemId: null, upgrade: 0, statAwake: [null, null], skillAwake: null, cards: [] };
}

export function createAccessorySetEntry(id: number, setId: number | null): AccessorySetEntry {
  return {
    id,
    setId,
    earring1: 'plug',
    earring2: 'plug',
    necklace: 'gore',
    upgrades: { ring1: 0, ring2: 0, earring1: 0, earring2: 0, necklace: 0 },
  };
}

export function createFashionSetEntry(id: number): FashionSetEntry {
  return { id, speedPercent: 10, blessings: [], cloakItemId: null };
}

export function createPetEntry(id: number, petItemId: number | null, total: number): PetEntry {
  return { id, petItemId, total };
}

export function createGearSwap(id: number, statPageId: number): GearSwap {
  return {
    id,
    includeInResults: true,
    statPageId,
    equipmentSetId: null,
    accessorySetId: null,
    weaponId: null,
    offhand: null,
    fashionSetId: null,
    petId: null,
    maskItemId: null,
  };
}

/** Fresh state: Seraph 190, one empty stat page, RM buffs on, one empty swap (plan A0.4). */
export function createDefaultBuild(data: GameData): BuildState {
  const job = requireClass(data, DEFAULT_JOB_ID);
  const statPage = createStatPage(1);
  const swap = createGearSwap(2, statPage.id);

  return {
    schemaVersion: BUILD_SCHEMA_VERSION,
    nextId: 3,
    character: { jobId: job.id, level: job.maxLevel },
    statPages: [statPage],
    equipmentSets: [],
    weapons: [],
    shields: [],
    accessorySets: [],
    fashionSets: [],
    pets: [],
    buffs: {
      rmBuffs: { enabled: true, excludedSkillIds: [] },
      premiumItemIds: [],
      personalNpcIds: [],
      coupleNpcIds: [],
      guildNpcIds: [],
      achievementId: null,
    },
    gearSwaps: [swap],
  };
}
