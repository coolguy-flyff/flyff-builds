import { ShareDecodeError, ShareEncodeError } from './errors';

/**
 * Minimal binary primitives shared by every codec version: unsigned bytes, unsigned LEB128 varints,
 * zig-zag signed varints and length-prefixed UTF-8 strings. Reads are bounds-checked and report
 * `TRUNCATED`; writes reject values the wire format cannot hold.
 */

/** Strings (entry names, escaped parameter names) are capped at this many UTF-16 code units. */
export const MAX_STRING_LENGTH = 32;
/** Worst-case UTF-8 expansion of {@link MAX_STRING_LENGTH} characters. */
const MAX_STRING_BYTES = MAX_STRING_LENGTH * 4;
const MAX_U8 = 0xff;
const MAX_VARINT = 0xffffffff;
const MAX_VARINT_BYTES = 5;
const MIN_SIGNED = -(2 ** 31);
const MAX_SIGNED = 2 ** 31 - 1;
const CONTINUATION_BIT = 0x80;
const PAYLOAD_MASK = 0x7f;
const INITIAL_CAPACITY = 256;

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

export function zigZagEncode(value: number): number {
  return value < 0 ? -2 * value - 1 : 2 * value;
}

export function zigZagDecode(value: number): number {
  return value % 2 === 0 ? value / 2 : -(value + 1) / 2;
}

function assertInteger(value: number, min: number, max: number, kind: string): void {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ShareEncodeError(`${kind} cannot hold ${value} (allowed ${min}..${max})`);
  }
}

export class ByteWriter {
  private buffer = new Uint8Array(INITIAL_CAPACITY);
  private length = 0;

  writeU8(value: number): this {
    assertInteger(value, 0, MAX_U8, 'u8');
    this.reserve(1);
    this.buffer[this.length] = value;
    this.length += 1;

    return this;
  }

  /** Unsigned LEB128, up to 32 bits. */
  writeVarint(value: number): this {
    assertInteger(value, 0, MAX_VARINT, 'varint');
    let rest = value;

    while (rest >= CONTINUATION_BIT) {
      this.writeU8((rest % CONTINUATION_BIT) | CONTINUATION_BIT);
      rest = Math.floor(rest / CONTINUATION_BIT);
    }

    return this.writeU8(rest);
  }

  /** Zig-zag mapped signed value in an unsigned varint. */
  writeSigned(value: number): this {
    assertInteger(value, MIN_SIGNED, MAX_SIGNED, 'signed varint');

    return this.writeVarint(zigZagEncode(value));
  }

  /** Varint byte length followed by UTF-8 bytes. */
  writeStr(value: string): this {
    if (value.length > MAX_STRING_LENGTH) {
      throw new ShareEncodeError(
        `string exceeds ${MAX_STRING_LENGTH} characters: "${value.slice(0, MAX_STRING_LENGTH)}…"`,
      );
    }

    const bytes = utf8Encoder.encode(value);
    this.writeVarint(bytes.length);

    return this.writeBytes(bytes);
  }

  writeBytes(bytes: Uint8Array): this {
    this.reserve(bytes.length);
    this.buffer.set(bytes, this.length);
    this.length += bytes.length;

    return this;
  }

  toBytes(): Uint8Array<ArrayBuffer> {
    return this.buffer.slice(0, this.length);
  }

  private reserve(extra: number): void {
    const needed = this.length + extra;

    if (needed > this.buffer.length) {
      const grown = new Uint8Array(Math.max(this.buffer.length * 2, needed));
      grown.set(this.buffer);
      this.buffer = grown;
    }
  }
}

export class ByteReader {
  private readonly bytes: Uint8Array;
  private position = 0;

  constructor(bytes: Uint8Array) {
    this.bytes = bytes;
  }

  get remaining(): number {
    return this.bytes.length - this.position;
  }

  readU8(): number {
    const value = this.bytes[this.position];

    if (value === undefined) {
      throw new ShareDecodeError('TRUNCATED', `unexpected end of data at byte ${this.position}`);
    }

    this.position += 1;

    return value;
  }

  readVarint(): number {
    let value = 0;
    let byteCount = 0;
    let byte = CONTINUATION_BIT;

    while (byte >= CONTINUATION_BIT) {
      if (byteCount === MAX_VARINT_BYTES) {
        throw new ShareDecodeError('CORRUPT', `varint longer than ${MAX_VARINT_BYTES} bytes`);
      }

      byte = this.readU8();
      value += (byte & PAYLOAD_MASK) * 2 ** (7 * byteCount);
      byteCount += 1;
    }

    if (value > MAX_VARINT) {
      throw new ShareDecodeError('CORRUPT', `varint ${value} exceeds 32 bits`);
    }

    return value;
  }

  readSigned(): number {
    return zigZagDecode(this.readVarint());
  }

  readBytes(length: number): Uint8Array {
    if (length > this.remaining) {
      throw new ShareDecodeError(
        'TRUNCATED',
        `needed ${length} bytes at byte ${this.position} but only ${this.remaining} remain`,
      );
    }

    const slice = this.bytes.subarray(this.position, this.position + length);
    this.position += length;

    return slice;
  }

  readStr(): string {
    const byteLength = this.readVarint();

    if (byteLength > MAX_STRING_BYTES) {
      throw new ShareDecodeError(
        'LIMIT_EXCEEDED',
        `string of ${byteLength} bytes exceeds ${MAX_STRING_LENGTH} characters`,
      );
    }

    const bytes = this.readBytes(byteLength);
    let value: string;

    try {
      value = utf8Decoder.decode(bytes);
    } catch (error) {
      throw new ShareDecodeError('CORRUPT', 'string is not valid UTF-8', { cause: error });
    }

    if (value.length > MAX_STRING_LENGTH) {
      throw new ShareDecodeError(
        'LIMIT_EXCEEDED',
        `string of ${value.length} characters exceeds ${MAX_STRING_LENGTH}`,
      );
    }

    return value;
  }
}
