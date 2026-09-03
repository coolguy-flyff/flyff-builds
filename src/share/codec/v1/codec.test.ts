import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import {
  createDefaultBuild,
  createFashionSetEntry,
  createGearSwap,
  createStatPage,
  createWeaponEntry,
} from '@/domain/build/defaults';
import type { BuildState } from '@/domain/build/schema';

import { ByteReader, ByteWriter } from '../../bytes';
import { decodeErrorCode } from '../../testing/errors';
import { maximalBuild, withoutV2Fields } from '../../testing/fixtures';
import { renumberIds } from '../../testing/ids';

import { decodeV1 } from './decode';
import { encodeV1 } from './encode';
import {
  readOptionalParam,
  readScaled,
  readStatAwake,
  writeParam,
  writeScaled,
  writeStatAwake,
} from './fields';
import { PARAM_ESCAPE, PARAM_NONE, PARAM_TABLE_V1 } from './tables';

const data = loadBundledGameData();

function bytesOf(write: (writer: ByteWriter) => void): Uint8Array {
  const writer = new ByteWriter();
  write(writer);

  return writer.toBytes();
}

function withByteFromEnd(body: Uint8Array, offsetFromEnd: number, value: number): Uint8Array {
  const copy = body.slice();
  copy[copy.length - offsetFromEnd] = value;

  return copy;
}

function appended(body: Uint8Array, ...extra: number[]): Uint8Array {
  const copy = new Uint8Array(body.length + extra.length);
  copy.set(body);
  copy.set(extra, body.length);

  return copy;
}

describe('encodeV1 / decodeV1', () => {
  it('round-trips the maximal build structurally and byte-for-byte, minus the v2 fields', () => {
    const build = maximalBuild(data);
    const bytes = encodeV1(build);
    const decoded = decodeV1(bytes);

    expect(decoded).toStrictEqual(withoutV2Fields(renumberIds(build)));
    expect(encodeV1(decoded)).toEqual(bytes);
  });

  it('assigns fresh ids in encounter order and remaps swap references', () => {
    const build: BuildState = {
      ...createDefaultBuild(data),
      nextId: 100,
      statPages: [createStatPage(50)],
      weapons: [createWeaponEntry(7)],
      gearSwaps: [{ ...createGearSwap(9, 50), weaponId: 7, offhand: { kind: 'weapon', id: 7 } }],
    };
    const decoded = decodeV1(encodeV1(build));

    expect(decoded.statPages.map((page) => page.id)).toEqual([1]);
    expect(decoded.weapons.map((weapon) => weapon.id)).toEqual([2]);
    expect(decoded.gearSwaps).toStrictEqual([
      { ...createGearSwap(3, 1), weaponId: 2, offhand: { kind: 'weapon', id: 2 } },
    ]);
    expect(decoded.nextId).toBe(4);
  });

  it('treats an empty custom name as absent', () => {
    const build: BuildState = {
      ...createDefaultBuild(data),
      statPages: [{ ...createStatPage(1), customName: '' }],
    };

    expect(decodeV1(encodeV1(build)).statPages[0]).toStrictEqual(createStatPage(1));
  });

  it('escapes parameters outside the table so old links survive data changes', () => {
    const build: BuildState = {
      ...createDefaultBuild(data),
      nextId: 5,
      weapons: [
        { ...createWeaponEntry(3), randomStats: [{ parameter: 'futuredamage', value: 7 }, null] },
      ],
      fashionSets: [
        { ...createFashionSetEntry(4), blessings: [{ parameter: 'futurestat', total: 3.5 }] },
      ],
    };
    const bytes = encodeV1(build);
    const decoded = decodeV1(bytes);

    expect(bytes).toContain(PARAM_ESCAPE);
    expect(decoded.weapons[0]?.randomStats).toEqual([
      { parameter: 'futuredamage', value: 7 },
      null,
    ]);
    expect(decoded.fashionSets[0]?.blessings).toEqual([{ parameter: 'futurestat', total: 3.5 }]);
  });

  it('snaps values to the parameter step', () => {
    const build: BuildState = {
      ...createDefaultBuild(data),
      nextId: 4,
      weapons: [
        {
          ...createWeaponEntry(3),
          statRanges: [16.25, -8, 80.9],
          randomStats: [
            { parameter: 'attack', value: 8.26 },
            { parameter: 'sta', value: 4.4 },
          ],
        },
      ],
    };
    const decoded = decodeV1(encodeV1(build));

    expect(decoded.weapons[0]?.statRanges).toEqual([16.25, -8, 80.9]);
    expect(decoded.weapons[0]?.randomStats).toEqual([
      { parameter: 'attack', value: 8.3 },
      { parameter: 'sta', value: 4 },
    ]);
  });

  it('reports malformed bodies with the matching codes', () => {
    const body = encodeV1(createDefaultBuild(data));
    // Trailing swap fields, counted from the end: mask, pet, fashion, offhand position, offhand
    // kind, weapon, accessory set, equipment set, stat page, flags, name, swap count.
    const cases: [string, Uint8Array, string][] = [
      ['truncated body', body.subarray(0, body.length - 3), 'TRUNCATED'],
      ['trailing bytes', appended(body, 0), 'CORRUPT'],
      ['stat page position 0', withByteFromEnd(body, 9, 0), 'CORRUPT'],
      ['stat page position out of range', withByteFromEnd(body, 9, 2), 'CORRUPT'],
      ['equipment position without entries', withByteFromEnd(body, 8, 1), 'CORRUPT'],
      ['unknown offhand kind', withByteFromEnd(body, 5, 3), 'CORRUPT'],
      ['shield offhand without shields', withByteFromEnd(body, 5, 1), 'CORRUPT'],
      ['offhand position without a kind', withByteFromEnd(body, 4, 1), 'CORRUPT'],
      ['reserved swap flag bits', withByteFromEnd(body, 10, 2), 'CORRUPT'],
      ['too many swaps', withByteFromEnd(body, 12, 17), 'LIMIT_EXCEEDED'],
      ['too many stat pages', withByteFromEnd(body, body.length - 4, 17), 'LIMIT_EXCEEDED'],
      [
        'no stat pages and no swaps',
        bytesOf((writer) => {
          writer.writeVarint(26141).writeU8(190);

          for (let index = 0; index < 15; index += 1) {
            writer.writeU8(0);
          }
        }),
        'CORRUPT',
      ],
    ];

    for (const [label, bytes, code] of cases) {
      expect(
        decodeErrorCode(() => decodeV1(bytes)),
        label,
      ).toBe(code);
    }
  });
});

describe('fields', () => {
  it('packs stat awakes into one byte per line', () => {
    const bytes = bytesOf((writer) => {
      writeStatAwake(writer, [
        { stat: 'sta', value: 1 },
        { stat: 'int', value: 4 },
      ]);
    });

    expect(Array.from(bytes)).toEqual([0b00101, 0b10011]);
    expect(readStatAwake(new ByteReader(bytes))).toEqual([
      { stat: 'sta', value: 1 },
      { stat: 'int', value: 4 },
    ]);
    expect(readStatAwake(new ByteReader(Uint8Array.from([0, 0])))).toEqual([null, null]);
    expect(decodeErrorCode(() => readStatAwake(new ByteReader(Uint8Array.from([1, 0]))))).toBe(
      'CORRUPT',
    );
    expect(
      decodeErrorCode(() => readStatAwake(new ByteReader(Uint8Array.from([0b10100, 0])))),
    ).toBe('CORRUPT');
  });

  it('writes table parameters as one byte and others through the escape', () => {
    const healing = PARAM_TABLE_V1.indexOf('healing');
    const known = bytesOf((writer) => {
      writeParam(writer, 'healing');
    });
    const escaped = bytesOf((writer) => {
      writeParam(writer, 'abc');
    });

    expect(Array.from(known)).toEqual([healing]);
    expect(Array.from(escaped)).toEqual([PARAM_ESCAPE, 3, 0x61, 0x62, 0x63]);
    expect(readOptionalParam(new ByteReader(known))).toBe('healing');
    expect(readOptionalParam(new ByteReader(escaped))).toBe('abc');
    expect(readOptionalParam(new ByteReader(Uint8Array.from([PARAM_NONE])))).toBeNull();
    expect(decodeErrorCode(() => readOptionalParam(new ByteReader(Uint8Array.from([200]))))).toBe(
      'CORRUPT',
    );
    expect(
      decodeErrorCode(() => readOptionalParam(new ByteReader(Uint8Array.from([PARAM_ESCAPE, 0])))),
    ).toBe('CORRUPT');
  });

  it.each([
    [-8, 0.01],
    [80.9, 0.1],
    [16.25, 0.05],
    [2.5, 0.01],
    [0, 1],
    [368, 0.01],
  ])('round-trips %f at step %f exactly', (value, step) => {
    const bytes = bytesOf((writer) => {
      writeScaled(writer, value, step);
    });

    expect(readScaled(new ByteReader(bytes), step)).toBe(value);
  });
});
