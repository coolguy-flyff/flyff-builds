import type { BuildState } from '@/domain/build/schema';

import { V1_RECORDS, writeBody } from './layout';

/**
 * Encodes the v1 body (without the envelope header). Kept for the round-trip tests that guard the
 * frozen layout; the app shares with the current version (see `src/share/index.ts`).
 */
export function encodeV1(build: BuildState): Uint8Array<ArrayBuffer> {
  return writeBody(build, V1_RECORDS);
}
