import { describe, expect, it } from 'vitest';

import { ByteReader, ByteWriter, MAX_STRING_LENGTH, zigZagDecode, zigZagEncode } from './bytes';
import { ShareEncodeError } from './errors';
import { decodeErrorCode } from './testing/errors';

function readerOf(...bytes: number[]): ByteReader {
  return new ByteReader(Uint8Array.from(bytes));
}

describe('varint', () => {
  it.each([
    [0, 1],
    [1, 1],
    [127, 1],
    [128, 2],
    [16383, 2],
    [16384, 3],
    [60000, 3],
    [2 ** 31, 5],
    [0xffffffff, 5],
  ])('round-trips %i in %i byte(s)', (value, byteCount) => {
    const bytes = new ByteWriter().writeVarint(value).toBytes();

    expect(bytes.length).toBe(byteCount);
    expect(new ByteReader(bytes).readVarint()).toBe(value);
  });

  it('rejects values the format cannot hold on write', () => {
    for (const value of [-1, 1.5, 2 ** 32, Number.NaN]) {
      expect(() => new ByteWriter().writeVarint(value)).toThrow(ShareEncodeError);
    }
  });

  it('reports TRUNCATED when the continuation byte is missing', () => {
    expect(decodeErrorCode(() => readerOf(0x80).readVarint())).toBe('TRUNCATED');
  });

  it('reports CORRUPT for over-long or over-wide encodings', () => {
    expect(decodeErrorCode(() => readerOf(0x80, 0x80, 0x80, 0x80, 0x80, 0x01).readVarint())).toBe(
      'CORRUPT',
    );
    expect(decodeErrorCode(() => readerOf(0xff, 0xff, 0xff, 0xff, 0x7f).readVarint())).toBe(
      'CORRUPT',
    );
  });
});

describe('signed varint', () => {
  it('maps small magnitudes to small codes', () => {
    expect([0, -1, 1, -2, 2].map(zigZagEncode)).toEqual([0, 1, 2, 3, 4]);
    expect([0, 1, 2, 3, 4].map(zigZagDecode)).toEqual([0, -1, 1, -2, 2]);
  });

  it.each([0, -1, 1, -8, 8090, -(2 ** 31), 2 ** 31 - 1])('round-trips %i', (value) => {
    const bytes = new ByteWriter().writeSigned(value).toBytes();

    expect(new ByteReader(bytes).readSigned()).toBe(value);
  });

  it('rejects values outside 32 bits', () => {
    expect(() => new ByteWriter().writeSigned(2 ** 31)).toThrow(ShareEncodeError);
    expect(() => new ByteWriter().writeSigned(-(2 ** 31) - 1)).toThrow(ShareEncodeError);
  });
});

describe('u8', () => {
  it('round-trips and rejects out-of-range values', () => {
    const bytes = new ByteWriter().writeU8(0).writeU8(255).toBytes();
    const reader = new ByteReader(bytes);

    expect([reader.readU8(), reader.readU8()]).toEqual([0, 255]);
    expect(reader.remaining).toBe(0);
    expect(decodeErrorCode(() => reader.readU8())).toBe('TRUNCATED');

    for (const value of [-1, 256, 1.5]) {
      expect(() => new ByteWriter().writeU8(value)).toThrow(ShareEncodeError);
    }
  });

  it('grows the buffer past its initial capacity', () => {
    const writer = new ByteWriter();

    for (let index = 0; index < 1000; index += 1) {
      writer.writeU8(index % 256);
    }

    const bytes = writer.toBytes();

    expect(bytes.length).toBe(1000);
    expect(bytes[999]).toBe(999 % 256);
  });
});

describe('str', () => {
  it.each(['', 'Page 1', 'Étranar ✨ 火', 'a'.repeat(MAX_STRING_LENGTH)])(
    'round-trips %j',
    (value) => {
      const bytes = new ByteWriter().writeStr(value).toBytes();

      expect(new ByteReader(bytes).readStr()).toBe(value);
    },
  );

  it('rejects strings longer than the cap on write', () => {
    expect(() => new ByteWriter().writeStr('a'.repeat(MAX_STRING_LENGTH + 1))).toThrow(
      ShareEncodeError,
    );
  });

  it('reports LIMIT_EXCEEDED for oversized strings without reading them', () => {
    // 129 as a varint: one more byte than 32 characters can ever need.
    expect(decodeErrorCode(() => readerOf(0x81, 0x01).readStr())).toBe('LIMIT_EXCEEDED');

    const tooLong = new Uint8Array(1 + MAX_STRING_LENGTH + 1).fill(0x61);
    tooLong[0] = MAX_STRING_LENGTH + 1;

    expect(decodeErrorCode(() => new ByteReader(tooLong).readStr())).toBe('LIMIT_EXCEEDED');
  });

  it('reports TRUNCATED when the bytes are missing and CORRUPT for invalid UTF-8', () => {
    expect(decodeErrorCode(() => readerOf(5, 0x61, 0x62).readStr())).toBe('TRUNCATED');
    expect(decodeErrorCode(() => readerOf(2, 0xff, 0xfe).readStr())).toBe('CORRUPT');
  });
});
