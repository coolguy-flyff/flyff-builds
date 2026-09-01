import type { GameData } from '@/data';
import type { BuildState, ValidatedBuild } from '@/domain/build';

import { parseEnvelope, serializeEnvelope } from './envelope';
import { STORAGE_KEYS } from './keys';
import type { StorageAdapter } from './storage';

/**
 * Snapshots are immutable copies of a build stored under their own keys; a small index lists them.
 * Missing or corrupt snapshot payloads are tolerated (reported as unloadable, never thrown).
 */
export interface SnapshotMeta {
  readonly id: string;
  readonly name: string;
  readonly savedAt: number;
  readonly jobId: number;
  readonly level: number;
  readonly swapCount: number;
  readonly automatic: boolean;
}

interface SnapshotIndex {
  readonly snapshots: SnapshotMeta[];
}

function readIndex(storage: StorageAdapter): SnapshotMeta[] {
  const raw = storage.get(STORAGE_KEYS.snapshotIndex);
  let snapshots: SnapshotMeta[] = [];

  if (raw !== null) {
    try {
      const parsed = JSON.parse(raw) as Partial<SnapshotIndex>;
      snapshots = Array.isArray(parsed.snapshots) ? parsed.snapshots : [];
    } catch {
      // A corrupt index only loses the listing; snapshot payloads stay under their own keys.
      snapshots = [];
    }
  }

  return snapshots;
}

function writeIndex(storage: StorageAdapter, snapshots: readonly SnapshotMeta[]): void {
  const index: SnapshotIndex = { snapshots: [...snapshots] };
  storage.set(STORAGE_KEYS.snapshotIndex, JSON.stringify(index));
}

function newId(now: number): string {
  return `${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function listSnapshots(storage: StorageAdapter): SnapshotMeta[] {
  return readIndex(storage).sort((a, b) => b.savedAt - a.savedAt);
}

export function saveSnapshot(
  storage: StorageAdapter,
  build: BuildState,
  name: string,
  now: number,
  automatic = false,
): SnapshotMeta {
  const meta: SnapshotMeta = {
    id: newId(now),
    name,
    savedAt: now,
    jobId: build.character.jobId,
    level: build.character.level,
    swapCount: build.gearSwaps.length,
    automatic,
  };

  storage.set(STORAGE_KEYS.snapshot(meta.id), serializeEnvelope(build, now, name));
  writeIndex(storage, [...readIndex(storage), meta]);

  return meta;
}

export function overwriteSnapshot(
  storage: StorageAdapter,
  id: string,
  build: BuildState,
  now: number,
): SnapshotMeta | undefined {
  const snapshots = readIndex(storage);
  const existing = snapshots.find((snapshot) => snapshot.id === id);
  let updated: SnapshotMeta | undefined;

  if (existing !== undefined) {
    const next: SnapshotMeta = {
      ...existing,
      savedAt: now,
      jobId: build.character.jobId,
      level: build.character.level,
      swapCount: build.gearSwaps.length,
    };

    storage.set(STORAGE_KEYS.snapshot(id), serializeEnvelope(build, now, existing.name));
    writeIndex(
      storage,
      snapshots.map((snapshot) => (snapshot.id === id ? next : snapshot)),
    );
    updated = next;
  }

  return updated;
}

export function renameSnapshot(storage: StorageAdapter, id: string, name: string): void {
  writeIndex(
    storage,
    readIndex(storage).map((snapshot) => (snapshot.id === id ? { ...snapshot, name } : snapshot)),
  );
}

export function deleteSnapshot(storage: StorageAdapter, id: string): void {
  storage.remove(STORAGE_KEYS.snapshot(id));
  writeIndex(
    storage,
    readIndex(storage).filter((snapshot) => snapshot.id !== id),
  );
}

export type SnapshotLoad =
  | { readonly ok: true; readonly value: ValidatedBuild }
  | { readonly ok: false; readonly message: string };

export function loadSnapshot(storage: StorageAdapter, data: GameData, id: string): SnapshotLoad {
  const raw = storage.get(STORAGE_KEYS.snapshot(id));
  let result: SnapshotLoad;

  if (raw === null) {
    result = { ok: false, message: 'Snapshot data is missing' };
  } else {
    const parsed = parseEnvelope(data, raw);
    result = parsed.ok
      ? { ok: true, value: parsed.value.validated }
      : { ok: false, message: parsed.error.message };
  }

  return result;
}
