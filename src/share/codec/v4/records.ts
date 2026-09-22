import type { BuffsState } from '@/domain/build/schema';

import type { ByteReader, ByteWriter } from '../../bytes';

import { MAX_U8_COUNT } from '../v1/fields';
import { readVarintList, writeVarintList, type RecordCodecs } from '../v1/layout';
import { readBuffsV2, writeBuffsV2 } from '../v2/records';
import { V3_RECORDS } from '../v3/records';

/**
 * The one record codec v4 changes (see LAYOUT.md): buffs append the active couple skills to the
 * v2 record. Everything else keeps the v3 encoding.
 */

/** v2 record, then the active couple skill ids. */
export function writeBuffsV4(writer: ByteWriter, buffs: BuffsState): void {
  writeBuffsV2(writer, buffs);
  writeVarintList(writer, buffs.coupleSkillIds, MAX_U8_COUNT, 'couple skills');
}

export function readBuffsV4(reader: ByteReader): BuffsState {
  const buffs = readBuffsV2(reader);
  const coupleSkillIds = readVarintList(reader, MAX_U8_COUNT, 'couple skills');

  return { ...buffs, coupleSkillIds };
}

export const V4_RECORDS: RecordCodecs = {
  ...V3_RECORDS,
  writeBuffs: writeBuffsV4,
  readBuffs: readBuffsV4,
};
