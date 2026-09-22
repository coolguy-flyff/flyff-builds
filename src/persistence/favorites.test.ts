import { afterEach, describe, expect, it, vi } from 'vitest';

import { readPremiumFavorites, writePremiumFavorites } from './favorites';
import { STORAGE_KEYS } from './keys';
import { createMemoryStorage } from './storage';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('premium favorites', () => {
  it('is undefined until something is saved', () => {
    expect(readPremiumFavorites(createMemoryStorage())).toBeUndefined();
  });

  it('round-trips the ids in order, an empty list included', () => {
    const storage = createMemoryStorage();

    writePremiumFavorites(storage, [6049, 445, 8691]);
    expect(readPremiumFavorites(storage)).toEqual([6049, 445, 8691]);

    writePremiumFavorites(storage, []);
    expect(readPremiumFavorites(storage)).toEqual([]);
  });

  it('drops duplicates', () => {
    const storage = createMemoryStorage({ [STORAGE_KEYS.premiumFavorites]: '[445,445,6049]' });

    expect(readPremiumFavorites(storage)).toEqual([445, 6049]);
  });

  it.each([
    ['broken JSON', '[445,'],
    ['not a list', '{"ids":[445]}'],
    ['non-integer ids', '[445,"eel"]'],
  ])('treats %s as unset and says so on the console', (_label, raw) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const storage = createMemoryStorage({ [STORAGE_KEYS.premiumFavorites]: raw });

    expect(readPremiumFavorites(storage)).toBeUndefined();
    expect(warn).toHaveBeenCalledOnce();
  });
});
