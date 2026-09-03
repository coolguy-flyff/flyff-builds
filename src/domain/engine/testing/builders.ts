import { CLASS_IDS, type GameData } from '@/data';
import { requireDefined } from '@/lib/assert';

import {
  createAccessorySetEntry,
  createDefaultBuild,
  createEquipmentSetEntry,
  createFashionSetEntry,
  createPetEntry,
  createShieldEntry,
  createWeaponEntry,
} from '../../build/defaults';
import type {
  AccessorySetEntry,
  BuildState,
  EquipmentSetEntry,
  FashionSetEntry,
  GearSwap,
  ShieldEntry,
  StatPage,
  WeaponEntry,
} from '../../build/schema';

/**
 * Mutable fixture helpers for engine tests and the parity suite: start from the default build,
 * append entries and wire them into the first swap. Test-only; production code never mutates.
 */

export interface TestBuildOptions {
  readonly jobId?: number;
  readonly level?: number;
  readonly stats?: Partial<Omit<StatPage, 'id' | 'customName'>>;
  /** RM buffs default to off so pins stay hand-computable. */
  readonly rmBuffs?: boolean;
  /** Class skills default to none (a fresh build would start with the job's passives). */
  readonly classSkillIds?: readonly number[];
}

export function createTestBuild(data: GameData, options: TestBuildOptions = {}): BuildState {
  const build = createDefaultBuild(data);
  const page = firstStatPage(build);

  build.character = { jobId: options.jobId ?? CLASS_IDS.seraph, level: options.level ?? 190 };
  Object.assign(page, options.stats);
  build.buffs.rmBuffs.enabled = options.rmBuffs ?? false;
  build.buffs.classSkillIds = [...(options.classSkillIds ?? [])];

  return build;
}

export function firstSwap(build: BuildState): GearSwap {
  return requireDefined(build.gearSwaps[0], 'fixture build has a swap');
}

export function firstStatPage(build: BuildState): StatPage {
  return requireDefined(build.statPages[0], 'fixture build has a stat page');
}

function takeId(build: BuildState): number {
  const id = build.nextId;

  build.nextId += 1;

  return id;
}

export function addWeapon(
  build: BuildState,
  weapon: Partial<Omit<WeaponEntry, 'id'>>,
  equip: 'mainhand' | 'offhand' | 'none' = 'mainhand',
): WeaponEntry {
  const entry: WeaponEntry = { ...createWeaponEntry(takeId(build)), ...weapon };

  build.weapons.push(entry);

  if (equip === 'mainhand') {
    firstSwap(build).weaponId = entry.id;
  } else if (equip === 'offhand') {
    firstSwap(build).offhand = { kind: 'weapon', id: entry.id };
  }

  return entry;
}

export function addShield(
  build: BuildState,
  shield: Partial<Omit<ShieldEntry, 'id'>>,
  equip = true,
): ShieldEntry {
  const entry: ShieldEntry = { ...createShieldEntry(takeId(build)), ...shield };

  build.shields.push(entry);

  if (equip) {
    firstSwap(build).offhand = { kind: 'shield', id: entry.id };
  }

  return entry;
}

export function addEquipmentSet(
  build: BuildState,
  set: Partial<Omit<EquipmentSetEntry, 'id'>> & { readonly setId: number },
): EquipmentSetEntry {
  const entry: EquipmentSetEntry = { ...createEquipmentSetEntry(takeId(build), set.setId), ...set };

  build.equipmentSets.push(entry);
  firstSwap(build).equipmentSetId = entry.id;

  return entry;
}

export function addAccessorySet(
  build: BuildState,
  set: Partial<Omit<AccessorySetEntry, 'id'>> & { readonly setId: number },
): AccessorySetEntry {
  const entry: AccessorySetEntry = { ...createAccessorySetEntry(takeId(build), set.setId), ...set };

  build.accessorySets.push(entry);
  firstSwap(build).accessorySetId = entry.id;

  return entry;
}

export function addFashionSet(
  build: BuildState,
  fashion: Partial<Omit<FashionSetEntry, 'id'>>,
): FashionSetEntry {
  const entry: FashionSetEntry = { ...createFashionSetEntry(takeId(build)), ...fashion };

  build.fashionSets.push(entry);
  firstSwap(build).fashionSetId = entry.id;

  return entry;
}

export function addPet(build: BuildState, petItemId: number, total: number): void {
  const entry = createPetEntry(takeId(build), petItemId, total);

  build.pets.push(entry);
  firstSwap(build).petId = entry.id;
}
