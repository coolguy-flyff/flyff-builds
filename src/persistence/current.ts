import type { GameData } from '@/data';
import type { BuildState, BuildWarning } from '@/domain/build';

import { parseEnvelope, serializeEnvelope } from './envelope';
import { STORAGE_KEYS } from './keys';
import type { StorageAdapter } from './storage';

export type CurrentBuildLoad =
  | { readonly kind: 'empty' }
  | {
      readonly kind: 'loaded';
      readonly build: BuildState;
      readonly warnings: readonly BuildWarning[];
    }
  | { readonly kind: 'corrupt'; readonly message: string; readonly preservedKey: string };

/**
 * Reads the working build. Corrupt data is never discarded: it is copied to a timestamped key so
 * the user can recover it, and the caller starts from defaults.
 */
export function readCurrentBuild(
  storage: StorageAdapter,
  data: GameData,
  now: number,
): CurrentBuildLoad {
  const raw = storage.get(STORAGE_KEYS.current);
  let result: CurrentBuildLoad = { kind: 'empty' };

  if (raw !== null) {
    const parsed = parseEnvelope(data, raw);

    if (parsed.ok) {
      result = {
        kind: 'loaded',
        build: parsed.value.validated.build,
        warnings: parsed.value.validated.warnings,
      };
    } else {
      const preservedKey = STORAGE_KEYS.corrupt(now);
      storage.set(preservedKey, raw);
      storage.remove(STORAGE_KEYS.current);
      result = { kind: 'corrupt', message: parsed.error.message, preservedKey };
    }
  }

  return result;
}

export function writeCurrentBuild(storage: StorageAdapter, build: BuildState, now: number): void {
  storage.set(STORAGE_KEYS.current, serializeEnvelope(build, now));
}
