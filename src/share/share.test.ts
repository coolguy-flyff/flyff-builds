import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build/defaults';
import type { BuildState } from '@/domain/build/schema';
import { validateBuild, type ValidatedBuild } from '@/domain/build/validate';

import { decodeBase64Url, encodeBase64Url } from './base64url';
import { encodeV1 } from './codec/v1/encode';
import {
  buildShareUrl,
  decodeShareCode,
  encodeShareCode,
  fflateDeflater,
  nativeDeflater,
  SHARE_ERROR_MESSAGES,
  ShareEncodeError,
  type Deflater,
  type ShareDecodeResult,
  type ShareErrorCode,
} from './index';
import { maximalBuild, typicalBuild } from './testing/fixtures';
import { renumberIds } from './testing/ids';
import { randomBuild } from './testing/randomBuild';

const data = loadBundledGameData();
const deflaters: [string, Deflater][] = [
  ['native', nativeDeflater],
  ['fflate', fflateDeflater],
];
const RANDOM_BUILD_COUNT = 50;
const FLAG_DEFLATED = 0b1;

function expectDecoded(result: ShareDecodeResult): ValidatedBuild {
  if (!result.ok) {
    throw new Error(`decoding failed: ${result.error.code}`);
  }

  return result.value;
}

async function roundTrip(build: BuildState, deflater: Deflater): Promise<ValidatedBuild> {
  const code = await encodeShareCode(data, build, deflater);

  return expectDecoded(await decodeShareCode(data, code, deflater));
}

async function expectFailure(input: string, deflater?: Deflater): Promise<ShareErrorCode> {
  const result = await decodeShareCode(data, input, deflater);

  if (result.ok) {
    throw new Error('expected decoding to fail');
  }

  expect(result.error.message).toBe(SHARE_ERROR_MESSAGES[result.error.code]);

  return result.error.code;
}

/** Wraps a body in the envelope without going through the encoder's validation gate. */
function codeOf(body: Uint8Array, version = 1, flags = 0): string {
  const bytes = new Uint8Array(2 + body.length);
  bytes[0] = version;
  bytes[1] = flags;
  bytes.set(body, 2);

  return encodeBase64Url(bytes);
}

function isDeflated(code: string): boolean {
  return ((decodeBase64Url(code)[1] ?? 0) & FLAG_DEFLATED) !== 0;
}

describe.each(deflaters)('round-trips with the %s deflater', (_name, deflater) => {
  it('the default build', async () => {
    const build = createDefaultBuild(data);
    const decoded = await roundTrip(build, deflater);

    expect(decoded.warnings).toEqual([]);
    expect(decoded.build).toStrictEqual(build);
  });

  it('a build using every field, modulo ids', async () => {
    const build = maximalBuild(data);
    const decoded = await roundTrip(build, deflater);

    expect(decoded.warnings).toEqual([]);
    expect(decoded.build).toStrictEqual(renumberIds(build));
  });

  it('the typical build', async () => {
    const build = typicalBuild(data);
    const decoded = await roundTrip(build, deflater);

    expect(decoded.warnings).toEqual([]);
    expect(decoded.build).toStrictEqual(renumberIds(build));
  });

  it(`${RANDOM_BUILD_COUNT} generated builds over the real data`, async () => {
    for (let seed = 1; seed <= RANDOM_BUILD_COUNT; seed += 1) {
      const build = randomBuild(data, seed);
      const validated = validateBuild(data, build);

      expect(validated.ok && validated.value.warnings, `seed ${seed} is valid`).toEqual([]);

      const decoded = await roundTrip(build, deflater);

      expect(decoded.warnings, `seed ${seed}`).toEqual([]);
      expect(decoded.build, `seed ${seed}`).toStrictEqual(renumberIds(build));
    }
  });
});

describe('cross-decoding', () => {
  it('decodes with fflate what native compressed and vice versa', async () => {
    const build = maximalBuild(data);
    const fromNative = await encodeShareCode(data, build, nativeDeflater);
    const fromFflate = await encodeShareCode(data, build, fflateDeflater);

    expect(isDeflated(fromNative)).toBe(true);
    expect(isDeflated(fromFflate)).toBe(true);
    expect(
      expectDecoded(await decodeShareCode(data, fromNative, fflateDeflater)).build,
    ).toStrictEqual(renumberIds(build));
    expect(
      expectDecoded(await decodeShareCode(data, fromFflate, nativeDeflater)).build,
    ).toStrictEqual(renumberIds(build));
  });

  it('keeps the plain body when deflating does not make it smaller', async () => {
    const inflating: Deflater = {
      deflateRaw: (bytes) => Promise.resolve(new Uint8Array(bytes.length + 1)),
      inflateRaw: () => Promise.reject(new Error('inflateRaw must not run for a plain body')),
    };
    const code = await encodeShareCode(data, createDefaultBuild(data), inflating);

    expect(isDeflated(code)).toBe(false);
    expect(expectDecoded(await decodeShareCode(data, code, inflating)).build).toStrictEqual(
      createDefaultBuild(data),
    );
  });
});

describe('input forms', () => {
  it('accepts the link built by buildShareUrl', async () => {
    const code = await encodeShareCode(data, typicalBuild(data));
    const decoded = expectDecoded(
      await decodeShareCode(data, buildShareUrl('https://flyffbuilds.example/', code)),
    );

    expect(decoded.build).toStrictEqual(renumberIds(typicalBuild(data)));
  });
});

describe('errors', () => {
  const defaultBody = encodeV1(createDefaultBuild(data));

  it('classifies bad input without throwing', async () => {
    const oversizedPages = defaultBody.slice();
    oversizedPages[4] = 17;

    const cases: [string, string, ShareErrorCode][] = [
      ['empty input', '', 'NOT_A_CODE'],
      ['junk', 'not a code!!!', 'NOT_A_CODE'],
      ['impossible base64url length', 'AQABC', 'BAD_BASE64'],
      ['a lone version byte', encodeBase64Url(Uint8Array.from([1])), 'TRUNCATED'],
      ['a truncated body', codeOf(defaultBody.subarray(0, 10)), 'TRUNCATED'],
      ['a future codec version', codeOf(defaultBody, 3), 'UNSUPPORTED_VERSION'],
      ['reserved envelope flags', codeOf(defaultBody, 1, 0b10), 'UNSUPPORTED_VERSION'],
      ['codec version 0', codeOf(defaultBody, 0), 'CORRUPT'],
      ['trailing bytes', codeOf(Uint8Array.from([...defaultBody, 0])), 'CORRUPT'],
      [
        'a body the schema rejects',
        codeOf(defaultBody.map((byte, i) => (i === 3 ? 0 : byte))),
        'CORRUPT',
      ],
      ['an oversized list', codeOf(oversizedPages), 'LIMIT_EXCEEDED'],
      ['an oversized code', encodeBase64Url(new Uint8Array(70_000)), 'LIMIT_EXCEEDED'],
    ];

    for (const [label, input, code] of cases) {
      expect(await expectFailure(input), label).toBe(code);
    }
  });

  it.each(deflaters)('reports an undecodable deflate stream as CORRUPT (%s)', async (_n, d) => {
    const code = codeOf(Uint8Array.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff]), 1, FLAG_DEFLATED);

    expect(await expectFailure(code, d)).toBe('CORRUPT');
  });

  it('never rejects the returned promise for bad input', async () => {
    for (const junk of ['', 'hello', 'AQ', '////', 'AQAB', codeOf(new Uint8Array(40))]) {
      await expect(decodeShareCode(data, junk)).resolves.toMatchObject({ ok: false });
    }
  });

  it('refuses to encode a build the schema rejects', async () => {
    const invalid: BuildState = { ...createDefaultBuild(data), statPages: [] };

    await expect(encodeShareCode(data, invalid)).rejects.toThrow(ShareEncodeError);
  });
});

describe('unknown ids inside a valid code', () => {
  it('decode successfully with warnings from validateBuild', async () => {
    const build = typicalBuild(data);
    const withUnknownWeapon: BuildState = {
      ...build,
      weapons: build.weapons.map((weapon, index) =>
        index === 0 ? { ...weapon, itemId: 999_999 } : weapon,
      ),
    };
    const decoded = expectDecoded(await decodeShareCode(data, codeOf(encodeV1(withUnknownWeapon))));

    expect(decoded.warnings.map((warning) => warning.code)).toContain('unknown-item');
    expect(decoded.build.weapons[0]?.itemId).toBeNull();
    expect(decoded.build.weapons[1]).toStrictEqual(renumberIds(build).weapons[1]);
  });
});

describe('size', () => {
  it('keeps the typical build within 450 characters and the default within 120', async () => {
    const typical = await encodeShareCode(data, typicalBuild(data));
    const fallback = await encodeShareCode(data, createDefaultBuild(data));

    expect(typical.length).toBeLessThanOrEqual(450);
    expect(fallback.length).toBeLessThanOrEqual(120);
  });
});
