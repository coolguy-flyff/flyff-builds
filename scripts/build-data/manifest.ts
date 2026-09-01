import type { Manifest } from '../../src/data/schema';

import type { SourceDigest } from './source';

export const GENERATOR_ID = 'build-data/1';

export function buildManifest(input: {
  sourceDir: string;
  dataVersion: number | undefined;
  digests: Readonly<Record<string, SourceDigest>>;
  counts: Readonly<Record<string, number>>;
  generatedAt: string;
}): Manifest {
  const manifest: Manifest = {
    generatedAt: input.generatedAt,
    generator: GENERATOR_ID,
    sourceDir: input.sourceDir,
    sources: { ...input.digests },
    counts: { ...input.counts },
  };

  if (input.dataVersion !== undefined) {
    manifest.dataVersion = input.dataVersion;
  }

  return manifest;
}
