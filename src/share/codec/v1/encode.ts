import {
  LIMITS,
  type AccessorySetEntry,
  type BuildState,
  type BuffsState,
  type EquipmentSetEntry,
  type FashionSetEntry,
  type GearSwap,
  type Offhand,
  type PetEntry,
  type ShieldEntry,
  type StatPage,
  type WeaponEntry,
} from '@/domain/build/schema';

import { ByteWriter } from '../../bytes';
import { ShareEncodeError } from '../../errors';

import {
  MAX_U8_COUNT,
  writeBlessingLine,
  writeCount,
  writeFlag,
  writeName,
  writeOptionalId,
  writeRandomLine,
  writeScaled,
  writeSetStatAwake,
  writeSkillAwake,
  writeStacks,
  writeStatAwake,
} from './fields';
import {
  ACCESSORY_PIECES_V1,
  BASE_STAT_OFFSET_V1,
  EARRING_VARIANTS_V1,
  NECKLACE_VARIANTS_V1,
  OFFHAND_KINDS_V1,
  RANGE_STEP_V1,
  STAT_KEYS_V1,
  VARIANT_EARRING1_SHIFT,
  VARIANT_EARRING2_SHIFT,
  VARIANT_NECKLACE_SHIFT,
} from './tables';

/**
 * Serialises a schema-valid build into the v1 body (see LAYOUT.md). Entry ids never leave the app:
 * swap slots are written as 1-based positions in the encoded lists. The build must satisfy the zod
 * schema (`validateBuild` guarantees it); this module only enforces what the byte layout adds
 * (list limits, id sentinels, enum membership).
 */

type Positions = ReadonlyMap<number, number>;

interface ListPositions {
  readonly statPages: Positions;
  readonly equipmentSets: Positions;
  readonly weapons: Positions;
  readonly shields: Positions;
  readonly accessorySets: Positions;
  readonly fashionSets: Positions;
  readonly pets: Positions;
}

type ItemWriter<T> = (writer: ByteWriter, item: T) => void;

function positionsOf(entries: readonly { id: number }[]): Positions {
  return new Map(entries.map((entry, index) => [entry.id, index + 1]));
}

function positionOf(positions: Positions, id: number, label: string): number {
  const position = positions.get(id);

  if (position === undefined) {
    throw new ShareEncodeError(`${label} ${id} is not in the build`);
  }

  return position;
}

function optionalPositionOf(positions: Positions, id: number | null, label: string): number {
  return id === null ? 0 : positionOf(positions, id, label);
}

function enumCode<T>(table: readonly T[], value: T, label: string): number {
  const code = table.indexOf(value);

  if (code < 0) {
    throw new ShareEncodeError(`${label} ${String(value)} is not representable`);
  }

  return code;
}

function writeList<T>(
  writer: ByteWriter,
  items: readonly T[],
  limit: number,
  label: string,
  writeItem: ItemWriter<T>,
): void {
  writeCount(writer, items.length, limit, label);

  for (const item of items) {
    writeItem(writer, item);
  }
}

function writeVarintList(
  writer: ByteWriter,
  ids: readonly number[],
  limit: number,
  label: string,
): void {
  writeList(writer, ids, limit, label, (w, id) => {
    w.writeVarint(id);
  });
}

function writeStatPage(writer: ByteWriter, page: StatPage): void {
  writeName(writer, page.customName);

  for (const stat of STAT_KEYS_V1) {
    writer.writeVarint(page[stat] - BASE_STAT_OFFSET_V1);
  }
}

function writeEquipmentSet(writer: ByteWriter, entry: EquipmentSetEntry): void {
  writeName(writer, entry.customName);
  writeOptionalId(writer, entry.setId);
  writer.writeU8(entry.upgrade);
  writeSetStatAwake(writer, entry.statAwake);
  writeStacks(writer, entry.suitCards);
}

function writeWeapon(writer: ByteWriter, entry: WeaponEntry): void {
  writeName(writer, entry.customName);
  writeOptionalId(writer, entry.itemId);
  writer.writeU8(entry.upgrade);
  writeStatAwake(writer, entry.statAwake);
  writeSkillAwake(writer, entry.skillAwake);
  writeStacks(writer, entry.cards);
  writeStacks(writer, entry.jewels);
  writeList(writer, entry.statRanges, MAX_U8_COUNT, 'stat ranges', (w, value) => {
    writeScaled(w, value, RANGE_STEP_V1);
  });
  writeList(
    writer,
    entry.randomStats,
    LIMITS.randomStatLines,
    'random-stat lines',
    writeRandomLine,
  );
}

function writeShield(writer: ByteWriter, entry: ShieldEntry): void {
  writeName(writer, entry.customName);
  writeOptionalId(writer, entry.itemId);
  writer.writeU8(entry.upgrade);
  writeStatAwake(writer, entry.statAwake);
  writeSkillAwake(writer, entry.skillAwake);
  writeStacks(writer, entry.cards);
}

function accessoryVariantsByte(entry: AccessorySetEntry): number {
  const earring1 = enumCode(EARRING_VARIANTS_V1, entry.earring1, 'earring variant');
  const earring2 = enumCode(EARRING_VARIANTS_V1, entry.earring2, 'earring variant');
  const necklace = enumCode(NECKLACE_VARIANTS_V1, entry.necklace, 'necklace variant');

  return (
    (earring1 << VARIANT_EARRING1_SHIFT) |
    (earring2 << VARIANT_EARRING2_SHIFT) |
    (necklace << VARIANT_NECKLACE_SHIFT)
  );
}

function writeAccessorySet(writer: ByteWriter, entry: AccessorySetEntry): void {
  writeName(writer, entry.customName);
  writeOptionalId(writer, entry.setId);
  writer.writeU8(accessoryVariantsByte(entry));

  for (const piece of ACCESSORY_PIECES_V1) {
    writer.writeU8(entry.upgrades[piece]);
  }
}

function writeFashionSet(writer: ByteWriter, entry: FashionSetEntry): void {
  writeName(writer, entry.customName);
  writer.writeU8(entry.speedPercent);
  writeList(writer, entry.blessings, LIMITS.blessingLines, 'blessing lines', writeBlessingLine);
  writeOptionalId(writer, entry.cloakItemId);
}

function writePet(writer: ByteWriter, entry: PetEntry): void {
  writeName(writer, entry.customName);
  writeOptionalId(writer, entry.petItemId);
  writer.writeVarint(entry.total);
}

function writeBuffs(writer: ByteWriter, buffs: BuffsState): void {
  writeFlag(writer, buffs.rmBuffs.enabled);
  writeVarintList(writer, buffs.rmBuffs.excludedSkillIds, MAX_U8_COUNT, 'excluded RM buffs');
  writeVarintList(writer, buffs.premiumItemIds, LIMITS.premiumItems, 'premium items');
  writeVarintList(writer, buffs.personalNpcIds, MAX_U8_COUNT, 'personal house NPCs');
  writeVarintList(writer, buffs.coupleNpcIds, MAX_U8_COUNT, 'couple house NPCs');
  writeVarintList(writer, buffs.guildNpcIds, MAX_U8_COUNT, 'guild ship NPCs');
  writeOptionalId(writer, buffs.achievementId);
}

function writeOffhand(writer: ByteWriter, offhand: Offhand, lists: ListPositions): void {
  let kind = 0;
  let position = 0;

  if (offhand !== null) {
    const entries = offhand.kind === 'shield' ? lists.shields : lists.weapons;
    kind = enumCode(OFFHAND_KINDS_V1, offhand.kind, 'offhand kind');
    position = positionOf(entries, offhand.id, `offhand ${offhand.kind}`);
  }

  writer.writeU8(kind);
  writer.writeU8(position);
}

function writeGearSwap(writer: ByteWriter, swap: GearSwap, lists: ListPositions): void {
  writeName(writer, swap.customName);
  writeFlag(writer, swap.includeInResults);
  writer.writeU8(positionOf(lists.statPages, swap.statPageId, 'stat page'));
  writer.writeU8(optionalPositionOf(lists.equipmentSets, swap.equipmentSetId, 'equipment set'));
  writer.writeU8(optionalPositionOf(lists.accessorySets, swap.accessorySetId, 'accessory set'));
  writer.writeU8(optionalPositionOf(lists.weapons, swap.weaponId, 'weapon'));
  writeOffhand(writer, swap.offhand, lists);
  writer.writeU8(optionalPositionOf(lists.fashionSets, swap.fashionSetId, 'fashion set'));
  writer.writeU8(optionalPositionOf(lists.pets, swap.petId, 'pet'));
  writeOptionalId(writer, swap.maskItemId);
}

/** Encodes the v1 body (without the envelope header). */
export function encodeV1(build: BuildState): Uint8Array<ArrayBuffer> {
  const writer = new ByteWriter();
  const lists: ListPositions = {
    statPages: positionsOf(build.statPages),
    equipmentSets: positionsOf(build.equipmentSets),
    weapons: positionsOf(build.weapons),
    shields: positionsOf(build.shields),
    accessorySets: positionsOf(build.accessorySets),
    fashionSets: positionsOf(build.fashionSets),
    pets: positionsOf(build.pets),
  };

  writer.writeVarint(build.character.jobId);
  writer.writeU8(build.character.level);
  writeList(writer, build.statPages, LIMITS.statPages, 'stat pages', writeStatPage);
  writeList(
    writer,
    build.equipmentSets,
    LIMITS.entriesPerList,
    'equipment sets',
    writeEquipmentSet,
  );
  writeList(writer, build.weapons, LIMITS.entriesPerList, 'weapons', writeWeapon);
  writeList(writer, build.shields, LIMITS.entriesPerList, 'shields', writeShield);
  writeList(
    writer,
    build.accessorySets,
    LIMITS.entriesPerList,
    'accessory sets',
    writeAccessorySet,
  );
  writeList(writer, build.fashionSets, LIMITS.entriesPerList, 'fashion sets', writeFashionSet);
  writeList(writer, build.pets, LIMITS.entriesPerList, 'pets', writePet);
  writeBuffs(writer, build.buffs);
  writeList(writer, build.gearSwaps, LIMITS.gearSwaps, 'gear swaps', (w, swap) => {
    writeGearSwap(w, swap, lists);
  });

  return writer.toBytes();
}
