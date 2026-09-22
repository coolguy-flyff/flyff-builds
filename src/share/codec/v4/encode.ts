import type { BuildState } from '@/domain/build/schema';

import { writeBody } from '../v1/layout';

import { V4_RECORDS } from './records';

/** Encodes the v4 body (without the envelope header). */
export function encodeV4(build: BuildState): Uint8Array<ArrayBuffer> {
  return writeBody(build, V4_RECORDS);
}
