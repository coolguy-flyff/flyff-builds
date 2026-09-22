import { z } from 'zod';

import { STORAGE_KEYS } from './keys';
import type { StorageAdapter } from './storage';

/**
 * The user's premium-item favorites: the quick toggles of the Buffs tab. A per-browser
 * convenience, never part of a build or a share code, so it lives under its own key.
 */

/** Generous cap; the list is edited by hand, one item at a time. */
export const MAX_PREMIUM_FAVORITES = 64;

const PremiumFavoritesSchema = z.array(z.number().int().nonnegative()).max(MAX_PREMIUM_FAVORITES);

/**
 * The stored favorites, or `undefined` when none were ever saved. An unreadable value is treated
 * like a missing one (the caller seeds its defaults over it): losing a hand-picked shortlist is a
 * nuisance, not data loss, and it is reported on the console.
 */
export function readPremiumFavorites(storage: StorageAdapter): number[] | undefined {
  const raw = storage.get(STORAGE_KEYS.premiumFavorites);
  let favorites: number[] | undefined;

  if (raw !== null) {
    let parsed: unknown;

    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      console.warn('Premium favorites are not valid JSON; using the defaults', error);
    }

    const result = PremiumFavoritesSchema.safeParse(parsed);

    if (result.success) {
      favorites = [...new Set(result.data)];
    } else if (parsed !== undefined) {
      console.warn('Premium favorites have an unexpected shape; using the defaults');
    }
  }

  return favorites;
}

export function writePremiumFavorites(storage: StorageAdapter, favorites: readonly number[]): void {
  storage.set(STORAGE_KEYS.premiumFavorites, JSON.stringify(favorites));
}
