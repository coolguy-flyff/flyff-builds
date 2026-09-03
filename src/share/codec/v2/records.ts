import {
  ACCESSORY_PIECE_KEYS,
  type AccessorySetEntry,
  type BuffsState,
} from '@/domain/build/schema';

import type { ByteReader, ByteWriter } from '../../bytes';

import { MAX_U8_COUNT, readOptionalId, writeOptionalId } from '../v1/fields';
import {
  readAccessorySetV1,
  readBuffsV1,
  readVarintList,
  writeAccessorySetV1,
  writeBuffsV1,
  writeVarintList,
  type RecordCodecs,
} from '../v1/layout';

/**
 * The two records codec v2 changes (see LAYOUT.md); both extend their v1 record with fields
 * appended at the end, so the v1 pairs do the shared part.
 */

/** v1 record, then one source `id?` (set or CW jewel line) per piece in wear order; 0 = the entry's set. */
export function writeAccessorySetV2(writer: ByteWriter, entry: AccessorySetEntry): void {
  writeAccessorySetV1(writer, entry);

  for (const piece of ACCESSORY_PIECE_KEYS) {
    writeOptionalId(writer, entry.pieceSources[piece]);
  }
}

export function readAccessorySetV2(reader: ByteReader, id: number): AccessorySetEntry {
  const entry = readAccessorySetV1(reader, id);
  const pieceSources = { ...entry.pieceSources };

  for (const piece of ACCESSORY_PIECE_KEYS) {
    pieceSources[piece] = readOptionalId(reader);
  }

  return { ...entry, pieceSources };
}

/** v1 record, then the active class skill ids. */
export function writeBuffsV2(writer: ByteWriter, buffs: BuffsState): void {
  writeBuffsV1(writer, buffs);
  writeVarintList(writer, buffs.classSkillIds, MAX_U8_COUNT, 'class skills');
}

export function readBuffsV2(reader: ByteReader): BuffsState {
  const buffs = readBuffsV1(reader);
  const classSkillIds = readVarintList(reader, MAX_U8_COUNT, 'class skills');

  return { ...buffs, classSkillIds };
}

export const V2_RECORDS: RecordCodecs = {
  writeAccessorySet: writeAccessorySetV2,
  readAccessorySet: readAccessorySetV2,
  writeBuffs: writeBuffsV2,
  readBuffs: readBuffsV2,
};
