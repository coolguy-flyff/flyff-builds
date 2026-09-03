import { emptyPieceSources } from '@/domain/build/defaults';
import {
  BUILD_SCHEMA_VERSION,
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

import { ByteReader, ByteWriter } from '../../bytes';
import { ShareEncodeError } from '../../errors';

import {
  corrupt,
  MAX_U8_COUNT,
  named,
  readBlessingLine,
  readCount,
  readFlag,
  readOptionalId,
  readRandomLine,
  readScaled,
  readSetStatAwake,
  readSkillAwake,
  readStacks,
  readStatAwake,
  tableEntry,
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
  VARIANT_EARRING_MASK,
  VARIANT_KNOWN_BITS,
  VARIANT_NECKLACE_MASK,
  VARIANT_NECKLACE_SHIFT,
} from './tables';

/**
 * The body layout introduced by codec v1 (see LAYOUT.md): the list structure plus one read/write
 * pair per record, each pair kept together so the two sides can be checked for symmetry at a
 * glance. Released encodings are frozen; a later version composes these pairs with its own
 * versions of the records it changes ({@link RecordCodecs}) instead of copying the layout.
 *
 * Entry ids never leave the app: swap slots are written as 1-based positions in the encoded lists
 * and decoders assign ids 1..n in encounter order. Structure is verified while reading (counts,
 * positions, enum codes, trailing bytes) and reported as `CORRUPT` / `LIMIT_EXCEEDED` /
 * `TRUNCATED`; content (item ids, values) is left to `validateBuild`, so decoding needs no game
 * data.
 */

// --- lists and positions --------------------------------------------------------------------

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

type Entries = readonly { readonly id: number }[];

interface DecodedLists {
  readonly statPages: Entries;
  readonly equipmentSets: Entries;
  readonly weapons: Entries;
  readonly shields: Entries;
  readonly accessorySets: Entries;
  readonly fashionSets: Entries;
  readonly pets: Entries;
}

class IdAllocator {
  private last = 0;

  next(): number {
    this.last += 1;

    return this.last;
  }

  get nextId(): number {
    return this.last + 1;
  }
}

function positionsOf(entries: Entries): Positions {
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

/** Resolves a 1-based position in an encoded list to the id assigned to that entry. */
function entryAt(entries: Entries, position: number, label: string): number {
  const entry = entries[position - 1];

  if (position === 0 || entry === undefined) {
    throw corrupt(`${label} position ${position} is out of range (1..${entries.length})`);
  }

  return entry.id;
}

function optionalEntryAt(entries: Entries, position: number, label: string): number | null {
  return position === 0 ? null : entryAt(entries, position, label);
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
  writeItem: (writer: ByteWriter, item: T) => void,
): void {
  writeCount(writer, items.length, limit, label);

  for (const item of items) {
    writeItem(writer, item);
  }
}

function readList<T>(reader: ByteReader, limit: number, label: string, readItem: () => T): T[] {
  const count = readCount(reader, limit, label);
  const items: T[] = [];

  for (let index = 0; index < count; index += 1) {
    items.push(readItem());
  }

  return items;
}

export function writeVarintList(
  writer: ByteWriter,
  ids: readonly number[],
  limit: number,
  label: string,
): void {
  writeList(writer, ids, limit, label, (w, id) => {
    w.writeVarint(id);
  });
}

export function readVarintList(reader: ByteReader, limit: number, label: string): number[] {
  return readList(reader, limit, label, () => reader.readVarint());
}

// --- stat page ------------------------------------------------------------------------------

function writeStatPage(writer: ByteWriter, page: StatPage): void {
  writeName(writer, page.customName);

  for (const stat of STAT_KEYS_V1) {
    writer.writeVarint(page[stat] - BASE_STAT_OFFSET_V1);
  }
}

function readStat(reader: ByteReader): number {
  return reader.readVarint() + BASE_STAT_OFFSET_V1;
}

function readStatPage(reader: ByteReader, id: number): StatPage {
  const name = reader.readStr();
  const str = readStat(reader);
  const sta = readStat(reader);
  const dex = readStat(reader);
  const int = readStat(reader);

  return named(name, { id, str, sta, dex, int });
}

// --- equipment set --------------------------------------------------------------------------

function writeEquipmentSet(writer: ByteWriter, entry: EquipmentSetEntry): void {
  writeName(writer, entry.customName);
  writeOptionalId(writer, entry.setId);
  writer.writeU8(entry.upgrade);
  writeSetStatAwake(writer, entry.statAwake);
  writeStacks(writer, entry.suitCards);
}

function readEquipmentSet(reader: ByteReader, id: number): EquipmentSetEntry {
  const name = reader.readStr();
  const setId = readOptionalId(reader);
  const upgrade = reader.readU8();
  const statAwake = readSetStatAwake(reader);
  const suitCards = readStacks(reader);

  return named(name, { id, setId, upgrade, statAwake, suitCards });
}

// --- weapon ---------------------------------------------------------------------------------

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

function readWeapon(reader: ByteReader, id: number): WeaponEntry {
  const name = reader.readStr();
  const itemId = readOptionalId(reader);
  const upgrade = reader.readU8();
  const statAwake = readStatAwake(reader);
  const skillAwake = readSkillAwake(reader);
  const cards = readStacks(reader);
  const jewels = readStacks(reader);
  const statRanges = readList(reader, MAX_U8_COUNT, 'stat ranges', () =>
    readScaled(reader, RANGE_STEP_V1),
  );
  const randomStats = readList(reader, LIMITS.randomStatLines, 'random-stat lines', () =>
    readRandomLine(reader),
  );

  return named(name, {
    id,
    itemId,
    upgrade,
    statAwake,
    skillAwake,
    cards,
    jewels,
    statRanges,
    randomStats,
  });
}

// --- shield ---------------------------------------------------------------------------------

function writeShield(writer: ByteWriter, entry: ShieldEntry): void {
  writeName(writer, entry.customName);
  writeOptionalId(writer, entry.itemId);
  writer.writeU8(entry.upgrade);
  writeStatAwake(writer, entry.statAwake);
  writeSkillAwake(writer, entry.skillAwake);
  writeStacks(writer, entry.cards);
}

function readShield(reader: ByteReader, id: number): ShieldEntry {
  const name = reader.readStr();
  const itemId = readOptionalId(reader);
  const upgrade = reader.readU8();
  const statAwake = readStatAwake(reader);
  const skillAwake = readSkillAwake(reader);
  const cards = readStacks(reader);

  return named(name, { id, itemId, upgrade, statAwake, skillAwake, cards });
}

// --- accessory set (v1 record: name, set, variants, upgrades) -------------------------------

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

/** The v1 accessory record; later versions append their fields after it. */
export function writeAccessorySetV1(writer: ByteWriter, entry: AccessorySetEntry): void {
  writeName(writer, entry.customName);
  writeOptionalId(writer, entry.setId);
  writer.writeU8(accessoryVariantsByte(entry));

  for (const piece of ACCESSORY_PIECES_V1) {
    writer.writeU8(entry.upgrades[piece]);
  }
}

/** Reads the v1 accessory record; every piece follows the entry's set (no overrides in v1). */
export function readAccessorySetV1(reader: ByteReader, id: number): AccessorySetEntry {
  const name = reader.readStr();
  const setId = readOptionalId(reader);
  const variants = reader.readU8();

  if ((variants & ~VARIANT_KNOWN_BITS) !== 0) {
    throw corrupt(`accessory variants byte ${variants} sets reserved bits`);
  }

  const earring1 = tableEntry(
    EARRING_VARIANTS_V1,
    (variants >> VARIANT_EARRING1_SHIFT) & VARIANT_EARRING_MASK,
    'earring variant',
  );
  const earring2 = tableEntry(
    EARRING_VARIANTS_V1,
    (variants >> VARIANT_EARRING2_SHIFT) & VARIANT_EARRING_MASK,
    'earring variant',
  );
  const necklace = tableEntry(
    NECKLACE_VARIANTS_V1,
    (variants >> VARIANT_NECKLACE_SHIFT) & VARIANT_NECKLACE_MASK,
    'necklace variant',
  );
  const upgrades: AccessorySetEntry['upgrades'] = {
    ring1: 0,
    ring2: 0,
    earring1: 0,
    earring2: 0,
    necklace: 0,
  };

  for (const piece of ACCESSORY_PIECES_V1) {
    upgrades[piece] = reader.readU8();
  }

  return named(name, {
    id,
    setId,
    earring1,
    earring2,
    necklace,
    upgrades,
    pieceSources: emptyPieceSources(),
  });
}

// --- fashion set ----------------------------------------------------------------------------

function writeFashionSet(writer: ByteWriter, entry: FashionSetEntry): void {
  writeName(writer, entry.customName);
  writer.writeU8(entry.speedPercent);
  writeList(writer, entry.blessings, LIMITS.blessingLines, 'blessing lines', writeBlessingLine);
  writeOptionalId(writer, entry.cloakItemId);
}

function readFashionSet(reader: ByteReader, id: number): FashionSetEntry {
  const name = reader.readStr();
  const speedPercent = reader.readU8();
  const blessings = readList(reader, LIMITS.blessingLines, 'blessing lines', () =>
    readBlessingLine(reader),
  );
  const cloakItemId = readOptionalId(reader);

  return named(name, { id, speedPercent, blessings, cloakItemId });
}

// --- pet ------------------------------------------------------------------------------------

function writePet(writer: ByteWriter, entry: PetEntry): void {
  writeName(writer, entry.customName);
  writeOptionalId(writer, entry.petItemId);
  writer.writeVarint(entry.total);
}

function readPet(reader: ByteReader, id: number): PetEntry {
  const name = reader.readStr();
  const petItemId = readOptionalId(reader);
  const total = reader.readVarint();

  return named(name, { id, petItemId, total });
}

// --- buffs (v1 record) ----------------------------------------------------------------------

/** The v1 buffs record; later versions append their fields after it. */
export function writeBuffsV1(writer: ByteWriter, buffs: BuffsState): void {
  writeFlag(writer, buffs.rmBuffs.enabled);
  writeVarintList(writer, buffs.rmBuffs.excludedSkillIds, MAX_U8_COUNT, 'excluded RM buffs');
  writeVarintList(writer, buffs.premiumItemIds, LIMITS.premiumItems, 'premium items');
  writeVarintList(writer, buffs.personalNpcIds, MAX_U8_COUNT, 'personal house NPCs');
  writeVarintList(writer, buffs.coupleNpcIds, MAX_U8_COUNT, 'couple house NPCs');
  writeVarintList(writer, buffs.guildNpcIds, MAX_U8_COUNT, 'guild ship NPCs');
  writeOptionalId(writer, buffs.achievementId);
}

/** Reads the v1 buffs record; v1 predates class skills, so none are active. */
export function readBuffsV1(reader: ByteReader): BuffsState {
  const enabled = readFlag(reader, 'buff flags');
  const excludedSkillIds = readVarintList(reader, MAX_U8_COUNT, 'excluded RM buffs');
  const premiumItemIds = readVarintList(reader, LIMITS.premiumItems, 'premium items');
  const personalNpcIds = readVarintList(reader, MAX_U8_COUNT, 'personal house NPCs');
  const coupleNpcIds = readVarintList(reader, MAX_U8_COUNT, 'couple house NPCs');
  const guildNpcIds = readVarintList(reader, MAX_U8_COUNT, 'guild ship NPCs');
  const achievementId = readOptionalId(reader);

  return {
    rmBuffs: { enabled, excludedSkillIds },
    classSkillIds: [],
    premiumItemIds,
    personalNpcIds,
    coupleNpcIds,
    guildNpcIds,
    achievementId,
  };
}

// --- gear swap ------------------------------------------------------------------------------

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

function readOffhand(reader: ByteReader, lists: DecodedLists): Offhand {
  const kind = tableEntry(OFFHAND_KINDS_V1, reader.readU8(), 'offhand kind');
  const position = reader.readU8();
  let offhand: Offhand = null;

  switch (kind) {
    case 'none':
      if (position !== 0) {
        throw corrupt(`offhand position ${position} given without an offhand kind`);
      }

      break;
    case 'shield':
      offhand = { kind, id: entryAt(lists.shields, position, 'offhand shield') };
      break;
    case 'weapon':
      offhand = { kind, id: entryAt(lists.weapons, position, 'offhand weapon') };
      break;
  }

  return offhand;
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

function readGearSwap(reader: ByteReader, id: number, lists: DecodedLists): GearSwap {
  const name = reader.readStr();
  const includeInResults = readFlag(reader, 'swap flags');
  const statPageId = entryAt(lists.statPages, reader.readU8(), 'stat page');
  const equipmentSetId = optionalEntryAt(lists.equipmentSets, reader.readU8(), 'equipment set');
  const accessorySetId = optionalEntryAt(lists.accessorySets, reader.readU8(), 'accessory set');
  const weaponId = optionalEntryAt(lists.weapons, reader.readU8(), 'weapon');
  const offhand = readOffhand(reader, lists);
  const fashionSetId = optionalEntryAt(lists.fashionSets, reader.readU8(), 'fashion set');
  const petId = optionalEntryAt(lists.pets, reader.readU8(), 'pet');
  const maskItemId = readOptionalId(reader);

  return named(name, {
    id,
    includeInResults,
    statPageId,
    equipmentSetId,
    accessorySetId,
    weaponId,
    offhand,
    fashionSetId,
    petId,
    maskItemId,
  });
}

// --- body -----------------------------------------------------------------------------------

/** The records a version defines for itself; everything else keeps the v1 encoding. */
export interface RecordCodecs {
  readonly writeAccessorySet: (writer: ByteWriter, entry: AccessorySetEntry) => void;
  readonly readAccessorySet: (reader: ByteReader, id: number) => AccessorySetEntry;
  readonly writeBuffs: (writer: ByteWriter, buffs: BuffsState) => void;
  readonly readBuffs: (reader: ByteReader) => BuffsState;
}

export const V1_RECORDS: RecordCodecs = {
  writeAccessorySet: writeAccessorySetV1,
  readAccessorySet: readAccessorySetV1,
  writeBuffs: writeBuffsV1,
  readBuffs: readBuffsV1,
};

/** Serialises a schema-valid build into a body of the v1 list layout (no envelope header). */
export function writeBody(build: BuildState, records: RecordCodecs): Uint8Array<ArrayBuffer> {
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
    records.writeAccessorySet,
  );
  writeList(writer, build.fashionSets, LIMITS.entriesPerList, 'fashion sets', writeFashionSet);
  writeList(writer, build.pets, LIMITS.entriesPerList, 'pets', writePet);
  records.writeBuffs(writer, build.buffs);
  writeList(writer, build.gearSwaps, LIMITS.gearSwaps, 'gear swaps', (w, swap) => {
    writeGearSwap(w, swap, lists);
  });

  return writer.toBytes();
}

/** Parses a body of the v1 list layout into a build candidate for `validateBuild`. */
export function readBody(bytes: Uint8Array, records: RecordCodecs): BuildState {
  const reader = new ByteReader(bytes);
  const ids = new IdAllocator();
  const jobId = reader.readVarint();
  const level = reader.readU8();
  const statPages = readList(reader, LIMITS.statPages, 'stat pages', () =>
    readStatPage(reader, ids.next()),
  );
  const equipmentSets = readList(reader, LIMITS.entriesPerList, 'equipment sets', () =>
    readEquipmentSet(reader, ids.next()),
  );
  const weapons = readList(reader, LIMITS.entriesPerList, 'weapons', () =>
    readWeapon(reader, ids.next()),
  );
  const shields = readList(reader, LIMITS.entriesPerList, 'shields', () =>
    readShield(reader, ids.next()),
  );
  const accessorySets = readList(reader, LIMITS.entriesPerList, 'accessory sets', () =>
    records.readAccessorySet(reader, ids.next()),
  );
  const fashionSets = readList(reader, LIMITS.entriesPerList, 'fashion sets', () =>
    readFashionSet(reader, ids.next()),
  );
  const pets = readList(reader, LIMITS.entriesPerList, 'pets', () => readPet(reader, ids.next()));
  const buffs = records.readBuffs(reader);
  const lists: DecodedLists = {
    statPages,
    equipmentSets,
    weapons,
    shields,
    accessorySets,
    fashionSets,
    pets,
  };
  const gearSwaps = readList(reader, LIMITS.gearSwaps, 'gear swaps', () =>
    readGearSwap(reader, ids.next(), lists),
  );

  if (statPages.length === 0 || gearSwaps.length === 0) {
    throw corrupt('a build needs at least one stat page and one gear swap');
  }

  if (reader.remaining > 0) {
    throw corrupt(`${reader.remaining} trailing bytes after the build`);
  }

  return {
    schemaVersion: BUILD_SCHEMA_VERSION,
    nextId: ids.nextId,
    character: { jobId, level },
    statPages,
    equipmentSets,
    weapons,
    shields,
    accessorySets,
    fashionSets,
    pets,
    buffs,
    gearSwaps,
  };
}
