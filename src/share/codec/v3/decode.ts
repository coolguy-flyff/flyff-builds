import type { BuildState } from '@/domain/build/schema';

import { readBody } from '../v1/layout';

import { V3_RECORDS } from './records';

/** Decodes a v3 body (without the envelope header) into a build candidate for `validateBuild`. */
export function decodeV3(bytes: Uint8Array): BuildState {
  return readBody(bytes, V3_RECORDS);
}
