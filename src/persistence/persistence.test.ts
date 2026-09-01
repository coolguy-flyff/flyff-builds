import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';

import { readCurrentBuild, writeCurrentBuild } from './current';
import { parseEnvelope, serializeEnvelope } from './envelope';
import { STORAGE_KEYS } from './keys';
import {
  deleteSnapshot,
  listSnapshots,
  loadSnapshot,
  overwriteSnapshot,
  renameSnapshot,
  saveSnapshot,
} from './snapshots';
import { createMemoryStorage } from './storage';

const data = loadBundledGameData();

describe('envelope', () => {
  it('round-trips a build with its metadata', () => {
    const build = createDefaultBuild(data);
    const raw = serializeEnvelope(build, 1234, 'My build');
    const parsed = parseEnvelope(data, raw);

    expect(parsed.ok).toBe(true);

    if (parsed.ok) {
      expect(parsed.value.validated.build).toEqual(build);
      expect(parsed.value.savedAt).toBe(1234);
      expect(parsed.value.name).toBe('My build');
    }
  });

  it('reports non-JSON, foreign and malformed payloads', () => {
    expect(parseEnvelope(data, '{').ok).toBe(false);
    expect(parseEnvelope(data, JSON.stringify({ hello: 1 })).ok).toBe(false);

    const malformed = parseEnvelope(
      data,
      JSON.stringify({
        format: 'flyffbuilds',
        schemaVersion: 1,
        savedAt: 0,
        build: { nope: true },
      }),
    );

    expect(malformed.ok).toBe(false);

    if (!malformed.ok) {
      expect(malformed.error.code).toBe('structure');
    }
  });
});

describe('current build', () => {
  it('starts empty, then reads back what was written', () => {
    const storage = createMemoryStorage();
    const build = createDefaultBuild(data);

    expect(readCurrentBuild(storage, data, 1).kind).toBe('empty');
    writeCurrentBuild(storage, build, 2);

    const loaded = readCurrentBuild(storage, data, 3);

    expect(loaded.kind).toBe('loaded');

    if (loaded.kind === 'loaded') {
      expect(loaded.build).toEqual(build);
    }
  });

  it('preserves corrupt data under a timestamped key instead of discarding it', () => {
    const storage = createMemoryStorage({ [STORAGE_KEYS.current]: 'not json at all' });
    const loaded = readCurrentBuild(storage, data, 42);

    expect(loaded.kind).toBe('corrupt');
    expect(storage.get(STORAGE_KEYS.current)).toBeNull();
    expect(storage.get(STORAGE_KEYS.corrupt(42))).toBe('not json at all');
  });
});

describe('snapshots', () => {
  it('saves, lists (newest first), renames, overwrites, loads and deletes', () => {
    const storage = createMemoryStorage();
    const build = createDefaultBuild(data);
    const first = saveSnapshot(storage, build, 'First', 10);
    const second = saveSnapshot(storage, build, 'Second', 20, true);

    expect(listSnapshots(storage).map((snapshot) => snapshot.name)).toEqual(['Second', 'First']);
    expect(second.automatic).toBe(true);

    renameSnapshot(storage, first.id, 'Renamed');
    expect(listSnapshots(storage).find((snapshot) => snapshot.id === first.id)?.name).toBe(
      'Renamed',
    );

    const updated = overwriteSnapshot(
      storage,
      first.id,
      { ...build, character: { ...build.character, level: 170 } },
      30,
    );

    expect(updated?.level).toBe(170);
    expect(updated?.savedAt).toBe(30);

    const loaded = loadSnapshot(storage, data, first.id);

    expect(loaded.ok).toBe(true);

    if (loaded.ok) {
      expect(loaded.value.build.character.level).toBe(170);
    }

    deleteSnapshot(storage, first.id);
    expect(listSnapshots(storage).map((snapshot) => snapshot.id)).toEqual([second.id]);
    expect(loadSnapshot(storage, data, first.id).ok).toBe(false);
  });
});
