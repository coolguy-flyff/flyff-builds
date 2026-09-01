import { ShareDecodeError } from './errors';

/**
 * base64url (RFC 4648 §5) without padding: the alphabet is URL- and hash-safe, so a code can sit in
 * a query string untouched. Implemented on plain integers so it runs identically in browsers and
 * Node (no `btoa`/`Buffer`).
 */

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
const SEXTET_MASK = 0x3f;
const OCTET_MASK = 0xff;
/** Enough bits to hold the carry between octets and sextets. */
const ACCUMULATOR_MASK = 0xffff;

function buildDecodeTable(): ReadonlyMap<string, number> {
  const table = new Map<string, number>();

  for (let index = 0; index < ALPHABET.length; index += 1) {
    table.set(ALPHABET.charAt(index), index);
  }

  return table;
}

const DECODE_TABLE = buildDecodeTable();

export function encodeBase64Url(bytes: Uint8Array): string {
  let out = '';
  let bits = 0;
  let bitCount = 0;

  for (const byte of bytes) {
    bits = ((bits << 8) | byte) & ACCUMULATOR_MASK;
    bitCount += 8;

    while (bitCount >= 6) {
      bitCount -= 6;
      out += ALPHABET.charAt((bits >> bitCount) & SEXTET_MASK);
    }
  }

  if (bitCount > 0) {
    out += ALPHABET.charAt((bits << (6 - bitCount)) & SEXTET_MASK);
  }

  return out;
}

/** Throws `ShareDecodeError('BAD_BASE64')` for characters outside the alphabet or an impossible length. */
export function decodeBase64Url(text: string): Uint8Array<ArrayBuffer> {
  if (text.length % 4 === 1) {
    throw new ShareDecodeError('BAD_BASE64', `impossible base64url length ${text.length}`);
  }

  const out = new Uint8Array(Math.floor((text.length * 6) / 8));
  let bits = 0;
  let bitCount = 0;
  let position = 0;

  for (const char of text) {
    const value = DECODE_TABLE.get(char);

    if (value === undefined) {
      throw new ShareDecodeError('BAD_BASE64', `character "${char}" is not base64url`);
    }

    bits = ((bits << 6) | value) & ACCUMULATOR_MASK;
    bitCount += 6;

    if (bitCount >= 8) {
      bitCount -= 8;
      out[position] = (bits >> bitCount) & OCTET_MASK;
      position += 1;
    }
  }

  return out;
}
