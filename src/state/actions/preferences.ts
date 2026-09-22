import { CURATED_POWERUP_IDS } from '@/config/curatedPowerups';
import {
  MAX_PREMIUM_FAVORITES,
  readPremiumFavorites,
  StorageError,
  writePremiumFavorites,
  type StorageAdapter,
} from '@/persistence';

import type { Preferences, ToastKind } from '../types';

import type { ActionContext } from './shared';

export interface PreferenceActions {
  /** Adds a premium item to the quick toggles, or takes it off. */
  togglePremiumFavorite(itemId: number): void;
  /** Puts the curated quick toggles back. */
  resetPremiumFavorites(): void;
}

type Notify = (kind: ToastKind, message: string) => void;

/**
 * The saved preferences; on first run the curated quick toggles are written as the user's
 * favorites, so later changes to the curated list never reshuffle a list the user already has.
 */
export function loadPreferences(storage: StorageAdapter): Preferences {
  let premiumFavorites = readPremiumFavorites(storage);

  if (premiumFavorites === undefined) {
    premiumFavorites = [...CURATED_POWERUP_IDS];

    try {
      writePremiumFavorites(storage, premiumFavorites);
    } catch (error) {
      if (!(error instanceof StorageError)) {
        throw error;
      }

      // Not fatal: the defaults still apply this session and seeding is retried on the next run.
      console.warn('Could not save the default premium favorites', error);
    }
  }

  return { premiumFavorites };
}

export function createPreferenceActions(
  { set, get, deps }: ActionContext,
  notify: Notify,
): PreferenceActions {
  const save = (premiumFavorites: number[]): void => {
    set((draft) => {
      draft.preferences.premiumFavorites = premiumFavorites;
    });

    try {
      writePremiumFavorites(deps.storage, premiumFavorites);
    } catch (error) {
      if (!(error instanceof StorageError)) {
        throw error;
      }

      notify('error', `${error.message}. Your favorites will reset on reload.`);
    }
  };

  return {
    togglePremiumFavorite(itemId) {
      const current = get().preferences.premiumFavorites;

      if (current.includes(itemId)) {
        save(current.filter((id) => id !== itemId));
      } else if (current.length < MAX_PREMIUM_FAVORITES) {
        save([...current, itemId]);
      }
    },

    resetPremiumFavorites() {
      save([...CURATED_POWERUP_IDS]);
    },
  };
}
