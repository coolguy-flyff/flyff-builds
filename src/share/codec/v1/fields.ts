import type {
  BlessingLine,
  RandomStatLine,
  SetStatAwake,
  SetStatAwakeLine,
  SkillAwake,
  Stack,
  StatAwake,
  StatAwakeLine,
} from '@/domain/build/schema';
import { roundTo } from '@/lib/math';

import type { ByteReader, ByteWriter } from '../../bytes';
import { ShareDecodeError, ShareEncodeError } from '../../errors';

import {
  BLESSING_STEP_V1,
  PARAM_ESCAPE,
  PARAM_NONE,
  PARAM_TABLE_V1,
  randomStatStepV1,
  SKILL_AWAKE_STEP_V1,
  STAT_KEYS_V1,
} from './tables';

/**
 * Read/write pairs for the composite fields of layout v1. Each pair sits together so the two sides
 * can be checked for symmetry at a glance; encode.ts and decode.ts only deal with list structure.
 */

/** Largest count a `u8` list header can carry. */
export const MAX_U8_COUNT = 0xff;
const AWAKE_STAT_MASK = 0b11;
const AWAKE_VALUE_SHIFT = 2;
const AWAKE_MIN_VALUE = 1;
const AWAKE_MAX_VALUE = 4;
/** Decoded scaled values are rounded to this many decimals to drop binary floating-point noise. */
const SCALED_DECIMALS = 4;

export function corrupt(detail: string): ShareDecodeError {
  return new ShareDecodeError('CORRUPT', detail);
}

/** Reads `table[index]`, rejecting codes the table does not define. */
export function tableEntry<T>(table: readonly T[], index: number, label: string): T {
  const entry = table[index];

  if (entry === undefined) {
    throw corrupt(`${label} code ${index} is not defined`);
  }

  return entry;
}

// --- list headers ---------------------------------------------------------------------------

export function writeCount(writer: ByteWriter, count: number, limit: number, label: string): void {
  if (count > limit) {
    throw new ShareEncodeError(`too many ${label}: ${count} (limit ${limit})`);
  }

  writer.writeU8(count);
}

export function readCount(reader: ByteReader, limit: number, label: string): number {
  const count = reader.readU8();

  if (count > limit) {
    throw new ShareDecodeError('LIMIT_EXCEEDED', `${count} ${label} exceed the limit of ${limit}`);
  }

  return count;
}

// --- flags ----------------------------------------------------------------------------------

export function writeFlag(writer: ByteWriter, value: boolean): void {
  writer.writeU8(value ? 1 : 0);
}

export function readFlag(reader: ByteReader, label: string): boolean {
  const byte = reader.readU8();

  if (byte > 1) {
    throw corrupt(`${label} byte ${byte} sets reserved bits`);
  }

  return byte === 1;
}

// --- optional game ids (0 = none) -----------------------------------------------------------

export function writeOptionalId(writer: ByteWriter, id: number | null): void {
  if (id === 0) {
    throw new ShareEncodeError('id 0 is reserved for "none"');
  }

  writer.writeVarint(id ?? 0);
}

export function readOptionalId(reader: ByteReader): number | null {
  const id = reader.readVarint();

  return id === 0 ? null : id;
}

// --- parameters -----------------------------------------------------------------------------

export function writeParam(writer: ByteWriter, parameter: string): void {
  const code = PARAM_TABLE_V1.indexOf(parameter);

  if (code >= 0) {
    writer.writeU8(code);
  } else {
    writer.writeU8(PARAM_ESCAPE);
    writer.writeStr(parameter);
  }
}

export function writeOptionalParam(writer: ByteWriter, parameter: string | null): void {
  if (parameter === null) {
    writer.writeU8(PARAM_NONE);
  } else {
    writeParam(writer, parameter);
  }
}

export function readOptionalParam(reader: ByteReader): string | null {
  const code = reader.readU8();
  let parameter: string | null;

  if (code === PARAM_NONE) {
    parameter = null;
  } else if (code === PARAM_ESCAPE) {
    parameter = reader.readStr();

    if (parameter === '') {
      throw corrupt('escaped parameter name is empty');
    }
  } else {
    parameter = tableEntry(PARAM_TABLE_V1, code, 'parameter');
  }

  return parameter;
}

export function readParam(reader: ByteReader): string {
  const parameter = readOptionalParam(reader);

  if (parameter === null) {
    throw corrupt('parameter expected but found the "none" code');
  }

  return parameter;
}

// --- scaled numbers -------------------------------------------------------------------------

export function writeScaled(writer: ByteWriter, value: number, step: number): void {
  writer.writeSigned(Math.round(value / step));
}

export function readScaled(reader: ByteReader, step: number): number {
  return roundTo(reader.readSigned() * step, SCALED_DECIMALS);
}

// --- parameter + value lines ----------------------------------------------------------------

interface ParamValue {
  readonly parameter: string;
  readonly value: number;
}

type StepOf = (parameter: string) => number;

function writeParamValue(writer: ByteWriter, line: ParamValue | null, stepOf: StepOf): void {
  writeOptionalParam(writer, line?.parameter ?? null);

  if (line !== null) {
    writeScaled(writer, line.value, stepOf(line.parameter));
  }
}

function readParamValue(reader: ByteReader, stepOf: StepOf): ParamValue | null {
  const parameter = readOptionalParam(reader);

  return parameter === null ? null : { parameter, value: readScaled(reader, stepOf(parameter)) };
}

const skillAwakeStep: StepOf = () => SKILL_AWAKE_STEP_V1;

export function writeSkillAwake(writer: ByteWriter, awake: SkillAwake | null): void {
  writeParamValue(writer, awake, skillAwakeStep);
}

export function readSkillAwake(reader: ByteReader): SkillAwake | null {
  return readParamValue(reader, skillAwakeStep);
}

export function writeRandomLine(writer: ByteWriter, line: RandomStatLine | null): void {
  writeParamValue(writer, line, randomStatStepV1);
}

export function readRandomLine(reader: ByteReader): RandomStatLine | null {
  return readParamValue(reader, randomStatStepV1);
}

export function writeBlessingLine(writer: ByteWriter, line: BlessingLine): void {
  writeParam(writer, line.parameter);
  writeScaled(writer, line.total, BLESSING_STEP_V1);
}

export function readBlessingLine(reader: ByteReader): BlessingLine {
  const parameter = readParam(reader);
  const total = readScaled(reader, BLESSING_STEP_V1);

  return { parameter, total };
}

// --- stat awake (2 × u8) --------------------------------------------------------------------

function awakeByte(line: StatAwakeLine | null): number {
  let byte = 0;

  if (line !== null) {
    const stat = STAT_KEYS_V1.indexOf(line.stat);

    if (stat < 0 || line.value < AWAKE_MIN_VALUE || line.value > AWAKE_MAX_VALUE) {
      throw new ShareEncodeError(`stat awake ${line.stat} +${line.value} is not representable`);
    }

    byte = stat | (line.value << AWAKE_VALUE_SHIFT);
  }

  return byte;
}

function readAwakeLine(reader: ByteReader): StatAwakeLine | null {
  const byte = reader.readU8();
  let line: StatAwakeLine | null = null;

  if (byte !== 0) {
    const stat = STAT_KEYS_V1[byte & AWAKE_STAT_MASK];
    const value = byte >> AWAKE_VALUE_SHIFT;

    if (stat === undefined || value < AWAKE_MIN_VALUE || value > AWAKE_MAX_VALUE) {
      throw corrupt(`invalid stat awake byte ${byte}`);
    }

    line = { stat, value };
  }

  return line;
}

export function writeStatAwake(writer: ByteWriter, awake: StatAwake): void {
  for (const line of awake) {
    writer.writeU8(awakeByte(line));
  }
}

export function readStatAwake(reader: ByteReader): StatAwake {
  const first = readAwakeLine(reader);
  const second = readAwakeLine(reader);

  return [first, second];
}

// --- equipment-set awake totals (2 × u8, values 1–16) ---------------------------------------

const SET_AWAKE_MAX_VALUE = 16;

function setAwakeByte(line: SetStatAwakeLine | null): number {
  let byte = 0;

  if (line !== null) {
    const stat = STAT_KEYS_V1.indexOf(line.stat);

    if (stat < 0 || line.value < AWAKE_MIN_VALUE || line.value > SET_AWAKE_MAX_VALUE) {
      throw new ShareEncodeError(`set stat awake ${line.stat} +${line.value} is not representable`);
    }

    byte = stat | (line.value << AWAKE_VALUE_SHIFT);
  }

  return byte;
}

function readSetAwakeLine(reader: ByteReader): SetStatAwakeLine | null {
  const byte = reader.readU8();
  let line: SetStatAwakeLine | null = null;

  if (byte !== 0) {
    const stat = STAT_KEYS_V1[byte & AWAKE_STAT_MASK];
    const value = byte >> AWAKE_VALUE_SHIFT;

    if (stat === undefined || value < AWAKE_MIN_VALUE || value > SET_AWAKE_MAX_VALUE) {
      throw corrupt(`invalid set stat awake byte ${byte}`);
    }

    line = { stat, value };
  }

  return line;
}

export function writeSetStatAwake(writer: ByteWriter, awake: SetStatAwake): void {
  for (const line of awake) {
    writer.writeU8(setAwakeByte(line));
  }
}

export function readSetStatAwake(reader: ByteReader): SetStatAwake {
  const first = readSetAwakeLine(reader);
  const second = readSetAwakeLine(reader);

  return [first, second];
}

// --- card / jewel stacks --------------------------------------------------------------------

export function writeStacks(writer: ByteWriter, stacks: readonly Stack[]): void {
  writeCount(writer, stacks.length, MAX_U8_COUNT, 'stacks');

  for (const stack of stacks) {
    writer.writeVarint(stack.itemId);
    writer.writeU8(stack.count);
  }
}

export function readStacks(reader: ByteReader): Stack[] {
  const count = reader.readU8();
  const stacks: Stack[] = [];

  for (let index = 0; index < count; index += 1) {
    const itemId = reader.readVarint();
    const stackCount = reader.readU8();

    if (stackCount === 0) {
      throw corrupt(`stack of item ${itemId} is empty`);
    }

    stacks.push({ itemId, count: stackCount });
  }

  return stacks;
}

// --- entry names ----------------------------------------------------------------------------

/** A missing custom name travels as the empty string. */
export function writeName(writer: ByteWriter, customName: string | undefined): void {
  writer.writeStr(customName ?? '');
}

/** Attaches a decoded name to an entry; '' means "no custom name" and leaves the key absent. */
export function named<T extends object>(name: string, entry: T): T & { customName?: string } {
  return name === '' ? entry : { ...entry, customName: name };
}
