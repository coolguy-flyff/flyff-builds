/**
 * Minimal key/value storage abstraction so persistence code is testable without a browser and so
 * quota/security failures surface as typed errors instead of being swallowed.
 */
export interface StorageAdapter {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
  keys(): string[];
}

export class StorageError extends Error {
  constructor(
    message: string,
    override readonly cause: unknown,
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

export function createMemoryStorage(
  initial: Readonly<Record<string, string>> = {},
): StorageAdapter {
  const store = new Map(Object.entries(initial));

  return {
    get: (key) => store.get(key) ?? null,
    set: (key, value) => {
      store.set(key, value);
    },
    remove: (key) => {
      store.delete(key);
    },
    keys: () => [...store.keys()],
  };
}

/** Wraps `window.localStorage`; write failures (quota, private mode) become {@link StorageError}. */
export function createLocalStorage(localStorage: Storage): StorageAdapter {
  return {
    get: (key) => localStorage.getItem(key),
    set: (key, value) => {
      try {
        localStorage.setItem(key, value);
      } catch (error) {
        throw new StorageError(`Could not save to browser storage (${key})`, error);
      }
    },
    remove: (key) => {
      localStorage.removeItem(key);
    },
    keys: () => {
      const keys: string[] = [];

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);

        if (key !== null) {
          keys.push(key);
        }
      }

      return keys;
    },
  };
}
