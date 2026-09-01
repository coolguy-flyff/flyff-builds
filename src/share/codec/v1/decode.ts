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

import { ByteReader } from '../../bytes';

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
} from './fields';
import {
  ACCESSORY_PIECES_V1,
  BASE_STAT_OFFSET_V1,
  EARRING_VARIANTS_V1,
  NECKLACE_VARIANTS_V1,
  OFFHAND_KINDS_V1,
  RANGE_STEP_V1,
  VARIANT_EARRING1_SHIFT,
  VARIANT_EARRING2_SHIFT,
  VARIANT_EARRING_MASK,
  VARIANT_KNOWN_BITS,
  VARIANT_NECKLACE_MASK,
  VARIANT_NECKLACE_SHIFT,
} from './tables';

/**
 * Parses a v1 body into a build candidate. Structure is verified here (counts, positions, enum
 * codes, trailing bytes) and reported as `CORRUPT`/`LIMIT_EXCEEDED`/`TRUNCATED`; content (item
 * ids, values) is verified afterwards by `validateBuild`. Ids are assigned 1..n in encounter order
 * and `nextId` follows the last one. Decoding needs no game data.
 */

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

function readList<T>(reader: ByteReader, limit: number, label: string, readItem: () => T): T[] {
  const count = readCount(reader, limit, label);
  const items: T[] = [];

  for (let index = 0; index < count; index += 1) {
    items.push(readItem());
  }

  return items;
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

function readEquipmentSet(reader: ByteReader, id: number): EquipmentSetEntry {
  const name = reader.readStr();
  const setId = readOptionalId(reader);
  const upgrade = reader.readU8();
  const statAwake = readSetStatAwake(reader);
  const suitCards = readStacks(reader);

  return named(name, { id, setId, upgrade, statAwake, suitCards });
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

function readShield(reader: ByteReader, id: number): ShieldEntry {
  const name = reader.readStr();
  const itemId = readOptionalId(reader);
  const upgrade = reader.readU8();
  const statAwake = readStatAwake(reader);
  const skillAwake = readSkillAwake(reader);
  const cards = readStacks(reader);

  return named(name, { id, itemId, upgrade, statAwake, skillAwake, cards });
}

function readAccessorySet(reader: ByteReader, id: number): AccessorySetEntry {
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

  return named(name, { id, setId, earring1, earring2, necklace, upgrades });
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

function readPet(reader: ByteReader, id: number): PetEntry {
  const name = reader.readStr();
  const petItemId = readOptionalId(reader);
  const total = reader.readVarint();

  return named(name, { id, petItemId, total });
}

function readBuffs(reader: ByteReader): BuffsState {
  const enabled = readFlag(reader, 'buff flags');
  const excludedSkillIds = readList(reader, MAX_U8_COUNT, 'excluded RM buffs', () =>
    reader.readVarint(),
  );
  const premiumItemIds = readList(reader, LIMITS.premiumItems, 'premium items', () =>
    reader.readVarint(),
  );
  const personalNpcIds = readList(reader, MAX_U8_COUNT, 'personal house NPCs', () =>
    reader.readVarint(),
  );
  const coupleNpcIds = readList(reader, MAX_U8_COUNT, 'couple house NPCs', () =>
    reader.readVarint(),
  );
  const guildNpcIds = readList(reader, MAX_U8_COUNT, 'guild ship NPCs', () => reader.readVarint());
  const achievementId = readOptionalId(reader);

  return {
    rmBuffs: { enabled, excludedSkillIds },
    premiumItemIds,
    personalNpcIds,
    coupleNpcIds,
    guildNpcIds,
    achievementId,
  };
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

/** Decodes a v1 body (without the envelope header) into a build candidate for `validateBuild`. */
export function decodeV1(bytes: Uint8Array): BuildState {
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
    readAccessorySet(reader, ids.next()),
  );
  const fashionSets = readList(reader, LIMITS.entriesPerList, 'fashion sets', () =>
    readFashionSet(reader, ids.next()),
  );
  const pets = readList(reader, LIMITS.entriesPerList, 'pets', () => readPet(reader, ids.next()));
  const buffs = readBuffs(reader);
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
