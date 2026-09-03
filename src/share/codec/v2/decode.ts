import type { BuildState } from '@/domain/build/schema';

import { readBody } from '../v1/layout';

import { V2_RECORDS } from './records';

/** Decodes a v2 body (without the envelope header) into a build candidate for `validateBuild`. */
export function decodeV2(bytes: Uint8Array): BuildState {
  return readBody(bytes, V2_RECORDS);
}
