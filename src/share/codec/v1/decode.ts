import type { BuildState } from '@/domain/build/schema';

import { readBody, V1_RECORDS } from './layout';

/**
 * Decodes a v1 body (without the envelope header) into a build candidate for `validateBuild`.
 * Fields introduced after v1 take their "nothing configured" values: no per-piece accessory sets,
 * no class skills.
 */
export function decodeV1(bytes: Uint8Array): BuildState {
  return readBody(bytes, V1_RECORDS);
}
