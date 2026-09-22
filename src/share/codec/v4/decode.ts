import type { BuildState } from '@/domain/build/schema';

import { readBody } from '../v1/layout';

import { V4_RECORDS } from './records';

/** Decodes a v4 body (without the envelope header) into a build candidate for `validateBuild`. */
export function decodeV4(bytes: Uint8Array): BuildState {
  return readBody(bytes, V4_RECORDS);
}
