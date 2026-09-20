import { LIMITS, type PvpTarget } from '@/domain/build/schema';

import type { ByteReader, ByteWriter } from '../../bytes';

import { readScaled, writeName, writeScaled } from '../v1/fields';
import { readList, writeList, type RecordCodecs } from '../v1/layout';
import { V2_RECORDS } from '../v2/records';

/**
 * The one record codec v3 adds (see LAYOUT.md): the build's custom PvP targets, appended after
 * the swaps. Everything before them keeps the v2 encoding.
 */

/** Percentages travel in tenths; `validateBuild` rounds a target to one decimal first. */
const PERCENT_STEP_V3 = 0.1;

/** name, varint defense, varint magicDefense, then the four percentages as scaled(0.1). */
export function writePvpTargetV3(writer: ByteWriter, target: PvpTarget): void {
  writeName(writer, target.name);
  writer.writeVarint(target.defense);
  writer.writeVarint(target.magicDefense);
  writeScaled(writer, target.magicResistance, PERCENT_STEP_V3);
  writeScaled(writer, target.criticalResist, PERCENT_STEP_V3);
  writeScaled(writer, target.pvpDamageReduction, PERCENT_STEP_V3);
  writeScaled(writer, target.incomingDamage, PERCENT_STEP_V3);
}

export function readPvpTargetV3(reader: ByteReader, id: number): PvpTarget {
  const name = reader.readStr();
  const defense = reader.readVarint();
  const magicDefense = reader.readVarint();
  const magicResistance = readScaled(reader, PERCENT_STEP_V3);
  const criticalResist = readScaled(reader, PERCENT_STEP_V3);
  const pvpDamageReduction = readScaled(reader, PERCENT_STEP_V3);
  const incomingDamage = readScaled(reader, PERCENT_STEP_V3);

  return {
    id,
    name,
    defense,
    magicDefense,
    magicResistance,
    criticalResist,
    pvpDamageReduction,
    incomingDamage,
  };
}

export function writePvpTargetsV3(writer: ByteWriter, targets: readonly PvpTarget[]): void {
  writeList(writer, targets, LIMITS.pvpTargets, 'PvP targets', writePvpTargetV3);
}

export function readPvpTargetsV3(reader: ByteReader, nextId: () => number): PvpTarget[] {
  return readList(reader, LIMITS.pvpTargets, 'PvP targets', () =>
    readPvpTargetV3(reader, nextId()),
  );
}

export const V3_RECORDS: RecordCodecs = {
  ...V2_RECORDS,
  writePvpTargets: writePvpTargetsV3,
  readPvpTargets: readPvpTargetsV3,
};
