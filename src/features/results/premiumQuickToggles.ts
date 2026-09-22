import type { SlimItem } from '@/data';
import { LIMITS } from '@/domain/build';
import { premiumItemEffect } from '@/features/buffs/effectText';
import { useFavoritePremiumItems } from '@/features/buffs/premiumFavorites';
import { useActions, useAppStore, useGameData } from '@/state';

export interface PremiumQuickToggle {
  readonly item: SlimItem;
  readonly effect: string;
  readonly active: boolean;
  /** At the active-item limit, inactive items cannot be switched on. */
  readonly disabled: boolean;
}

export interface PremiumQuickToggles {
  /** One per favorite, in the user's order. */
  readonly toggles: readonly PremiumQuickToggle[];
  /** Every active premium item, favorites or not. */
  readonly activeCount: number;
  readonly onToggle: (itemId: number) => void;
  readonly onClear: () => void;
}

/**
 * The favorites as switches on the build's own premium items (not a Results-only what-if): the
 * Buffs & Swaps tab shows the same state.
 */
export function usePremiumQuickToggles(): PremiumQuickToggles {
  const data = useGameData();
  const activeIds = useAppStore((state) => state.build.buffs.premiumItemIds);
  const favorites = useFavoritePremiumItems();
  const actions = useActions();
  const active = new Set(activeIds);
  const atLimit = activeIds.length >= LIMITS.premiumItems;

  return {
    toggles: favorites.map((item) => ({
      item,
      effect: premiumItemEffect(data, item),
      active: active.has(item.id),
      disabled: atLimit && !active.has(item.id),
    })),
    activeCount: activeIds.length,
    onToggle: (itemId) => {
      actions.toggleIdInList('premiumItemIds', itemId);
    },
    onClear: () => {
      actions.updateBuffs((buffs) => {
        buffs.premiumItemIds = [];
      });
    },
  };
}
