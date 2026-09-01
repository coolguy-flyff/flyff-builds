import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { createMemoryStorage, STORAGE_KEYS, writeCurrentBuild } from '@/persistence';

import { bootstrapApp } from './bootstrap';

const data = loadBundledGameData();
const HREF = 'http://localhost/#/character';

describe('bootstrapApp', () => {
  it('starts from the default build when storage is empty', () => {
    const { store } = bootstrapApp({
      storage: createMemoryStorage(),
      now: () => 1,
      href: HREF,
      replaceUrl: () => undefined,
    });

    expect(store.getState().build.character.level).toBe(190);
    expect(store.getState().ui.toasts).toEqual([]);
  });

  it('restores the saved working build and autosaves changes', () => {
    const storage = createMemoryStorage();

    writeCurrentBuild(
      storage,
      { ...createDefaultBuild(data), character: { jobId: 26141, level: 170 } },
      1,
    );

    const { store } = bootstrapApp({
      storage,
      now: () => 2,
      href: HREF,
      replaceUrl: () => undefined,
    });

    expect(store.getState().build.character.level).toBe(170);

    store.getState().actions.setLevel(180);

    expect(storage.get(STORAGE_KEYS.current)).toContain('"level":180');
  });

  it('preserves corrupt data under a timestamped key and warns', () => {
    const storage = createMemoryStorage({ [STORAGE_KEYS.current]: '{not json' });
    const { store } = bootstrapApp({
      storage,
      now: () => 42,
      href: HREF,
      replaceUrl: () => undefined,
    });

    expect(store.getState().build.character.level).toBe(190);
    expect(store.getState().ui.toasts[0]?.kind).toBe('error');
    expect(storage.get(STORAGE_KEYS.corrupt(42))).toBe('{not json');
    expect(storage.get(STORAGE_KEYS.current)).toBeNull();
  });

  it('opens the import dialog for ?b= links and strips the query', () => {
    let replaced = '';
    const href = 'http://localhost/?b=abc123#/results';
    const { store } = bootstrapApp({
      storage: createMemoryStorage(),
      now: () => 1,
      href,
      replaceUrl: (url) => {
        replaced = url;
      },
    });

    expect(store.getState().ui.dialog).toEqual({ kind: 'import', initialText: href });
    expect(replaced).toBe('http://localhost/#/results');
  });
});
