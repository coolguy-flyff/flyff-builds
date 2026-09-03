import type { BuildState } from '@/domain/build/schema';

import { writeBody } from '../v1/layout';

import { V2_RECORDS } from './records';

/** Encodes the v2 body (without the envelope header). */
export function encodeV2(build: BuildState): Uint8Array<ArrayBuffer> {
  return writeBody(build, V2_RECORDS);
}
