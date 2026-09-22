import { useMemo } from 'react';

import { getItem, type GameData, type SlimItem } from '@/data';
import { useAppStore, useGameData } from '@/state';

/** The items behind `ids`, in order; ids missing from the bundled data are skipped. */
export function knownItems(data: GameData, ids: readonly number[]): SlimItem[] {
  return ids.map((id) => getItem(data, id)).filter((item): item is SlimItem => item !== undefined);
}

/** The user's premium favorites (the quick toggles), as items in display order. */
export function useFavoritePremiumItems(): SlimItem[] {
  const data = useGameData();
  const favoriteIds = useAppStore((state) => state.preferences.premiumFavorites);

  return useMemo(() => knownItems(data, favoriteIds), [data, favoriteIds]);
}
