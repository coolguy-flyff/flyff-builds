import { describe, expect, it } from 'vitest';

import { decodeBase64Url, encodeBase64Url } from './base64url';
import { decodeErrorCode } from './testing/errors';

/** Independent reference: the platform's standard base64, made URL-safe and unpadded. */
function referenceEncode(bytes: Uint8Array): string {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join('');

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pseudoRandomBytes(length: number, seed: number): Uint8Array {
  const bytes = new Uint8Array(length);
  let state = seed;

  for (let index = 0; index < length; index += 1) {
    state = (state * 1103515245 + 12345) % 2 ** 31;
    bytes[index] = state % 256;
  }

  return bytes;
}

describe('base64url', () => {
  it.each([0, 1, 2, 3, 4, 5, 6, 7, 31, 100, 257])(
    'matches the reference encoding for %i byte(s) and round-trips',
    (length) => {
      const bytes = pseudoRandomBytes(length, length + 1);
      const encoded = encodeBase64Url(bytes);

      expect(encoded).toBe(referenceEncode(bytes));
      expect(decodeBase64Url(encoded)).toEqual(bytes);
    },
  );

  it('uses the URL-safe alphabet without padding', () => {
    const encoded = encodeBase64Url(Uint8Array.from([0xfb, 0xff, 0xbf]));

    expect(encoded).toBe('-_-_');
    expect(encodeBase64Url(Uint8Array.from([1]))).toBe('AQ');
  });

  it('rejects characters outside the alphabet', () => {
    for (const input of ['AQ+', 'AQ/', 'AQ=', 'AQ ', 'ÄQ']) {
      expect(decodeErrorCode(() => decodeBase64Url(input))).toBe('BAD_BASE64');
    }
  });

  it('rejects lengths no byte sequence can produce', () => {
    for (const input of ['A', 'AAAAA']) {
      expect(decodeErrorCode(() => decodeBase64Url(input))).toBe('BAD_BASE64');
    }
  });
});
