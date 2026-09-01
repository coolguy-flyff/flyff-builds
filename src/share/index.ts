import type { GameData } from '@/data';
import type { BuildState } from '@/domain/build/schema';
import { validateBuild, type ValidatedBuild } from '@/domain/build/validate';

import { decodeBase64Url, encodeBase64Url } from './base64url';
import { ByteReader } from './bytes';
import { decodeV1 } from './codec/v1/decode';
import { encodeV1 } from './codec/v1/encode';
import { defaultDeflater, type Deflater } from './compression';
import {
  SHARE_ERROR_MESSAGES,
  ShareDecodeError,
  ShareEncodeError,
  type ShareErrorCode,
} from './errors';
import { parseShareInput } from './url';

/**
 * Share codes: `base64url([u8 version][u8 flags] + body)`. The body is the versioned layout
 * (`codec/v1/LAYOUT.md`), deflated when that is smaller (flag bit 0). Decoders of released
 * versions are kept forever and chosen by the version byte. Every decoded candidate goes through
 * `validateBuild`, so ids unknown to the current data degrade to warnings instead of failures.
 */

export type { ShareErrorCode } from './errors';
export { SHARE_ERROR_MESSAGES, ShareDecodeError, ShareEncodeError } from './errors';
export type { Deflater } from './compression';
export { defaultDeflater, fflateDeflater, nativeDeflater } from './compression';
export { buildShareUrl, parseShareInput } from './url';

export interface ShareDecodeFailure {
  readonly ok: false;
  readonly error: { readonly code: ShareErrorCode; readonly message: string };
}

export interface ShareDecodeSuccess {
  readonly ok: true;
  readonly value: ValidatedBuild;
}

export type ShareDecodeResult = ShareDecodeSuccess | ShareDecodeFailure;

type BodyDecoder = (body: Uint8Array) => BuildState;

const CODEC_VERSION_V1 = 1;
const CURRENT_CODEC_VERSION = CODEC_VERSION_V1;
const HEADER_BYTES = 2;
const FLAG_DEFLATED = 0b1;
const KNOWN_FLAGS = FLAG_DEFLATED;
/** Upper bound on a code's decoded byte size; real codes are a few hundred bytes. */
const MAX_CODE_BYTES = 64 * 1024;
/** Upper bound on an inflated body, bounding decompression bombs; the layout cannot reach it. */
const MAX_BODY_BYTES = 256 * 1024;

/** Every released body layout, by version byte. Entries are never removed. */
const DECODERS: ReadonlyMap<number, BodyDecoder> = new Map([[CODEC_VERSION_V1, decodeV1]]);

/**
 * Encodes the build as a share code. The build is validated first: a structurally invalid build is
 * a programmer error (`ShareEncodeError`), and semantic repairs are applied so the code decodes to
 * exactly what a recipient with the same data would see.
 */
export async function encodeShareCode(
  data: GameData,
  build: BuildState,
  deflater: Deflater = defaultDeflater(),
): Promise<string> {
  const validated = validateBuild(data, build);

  if (!validated.ok) {
    throw new ShareEncodeError(`cannot share an invalid build: ${validated.error.message}`);
  }

  const body = encodeV1(validated.value.build);
  const deflated = await deflater.deflateRaw(body);
  const useDeflated = deflated.length < body.length;
  const payload = useDeflated ? deflated : body;
  const code = new Uint8Array(HEADER_BYTES + payload.length);

  code[0] = CURRENT_CODEC_VERSION;
  code[1] = useDeflated ? FLAG_DEFLATED : 0;
  code.set(payload, HEADER_BYTES);

  return encodeBase64Url(code);
}

function decoderFor(version: number): BodyDecoder {
  const decoder = DECODERS.get(version);

  if (decoder === undefined) {
    if (version > CURRENT_CODEC_VERSION) {
      throw new ShareDecodeError('UNSUPPORTED_VERSION', `codec version ${version}`);
    }

    throw new ShareDecodeError('CORRUPT', `codec version ${version} never existed`);
  }

  return decoder;
}

async function inflate(deflater: Deflater, payload: Uint8Array): Promise<Uint8Array> {
  let body: Uint8Array;

  try {
    body = await deflater.inflateRaw(payload);
  } catch (error) {
    throw new ShareDecodeError('CORRUPT', 'deflated body could not be inflated', { cause: error });
  }

  if (body.length > MAX_BODY_BYTES) {
    throw new ShareDecodeError('LIMIT_EXCEEDED', `inflated body of ${body.length} bytes`);
  }

  return body;
}

async function decodeCandidate(text: string, deflater: Deflater): Promise<BuildState> {
  const code = parseShareInput(text);

  if (code === undefined) {
    throw new ShareDecodeError('NOT_A_CODE', 'input holds no share code');
  }

  const bytes = decodeBase64Url(code);

  if (bytes.length > MAX_CODE_BYTES) {
    throw new ShareDecodeError('LIMIT_EXCEEDED', `code of ${bytes.length} bytes`);
  }

  const reader = new ByteReader(bytes);
  const decodeBody = decoderFor(reader.readU8());
  const flags = reader.readU8();

  if ((flags & ~KNOWN_FLAGS) !== 0) {
    throw new ShareDecodeError('UNSUPPORTED_VERSION', `unknown envelope flags ${flags}`);
  }

  const payload = reader.readBytes(reader.remaining);
  let body = payload;

  if ((flags & FLAG_DEFLATED) !== 0) {
    body = await inflate(deflater, payload);
  }

  return decodeBody(body);
}

/**
 * Decodes a link, a `?b=`/`#b=` fragment or a bare code. Never throws for bad input: every
 * input-dependent problem comes back as a failure with a user-facing message. Only programmer
 * errors (invariant violations) propagate.
 */
export async function decodeShareCode(
  data: GameData,
  text: string,
  deflater: Deflater = defaultDeflater(),
): Promise<ShareDecodeResult> {
  let result: ShareDecodeResult;

  try {
    const candidate = await decodeCandidate(text, deflater);
    const validated = validateBuild(data, candidate);

    if (!validated.ok) {
      throw new ShareDecodeError('CORRUPT', validated.error.message);
    }

    result = { ok: true, value: validated.value };
  } catch (error) {
    if (!(error instanceof ShareDecodeError)) {
      throw error;
    }

    result = { ok: false, error: { code: error.code, message: SHARE_ERROR_MESSAGES[error.code] } };
  }

  return result;
}
