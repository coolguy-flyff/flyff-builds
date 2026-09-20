import type { BuildState } from '@/domain/build/schema';

import { writeBody } from '../v1/layout';

import { V3_RECORDS } from './records';

/** Encodes the v3 body (without the envelope header). */
export function encodeV3(build: BuildState): Uint8Array<ArrayBuffer> {
  return writeBody(build, V3_RECORDS);
}
