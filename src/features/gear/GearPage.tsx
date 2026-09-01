import { useEffect } from 'react';

import type { GearListKey } from '@/domain/build';
import { useActions, useAppStore } from '@/state';

import { CategoryPills } from './CategoryPills';
import { GearCategoryView } from './GearCategoryView';

export interface GearPageProps {
  /** Category from the route; `null` means "use the last selected category". */
  category: GearListKey | null;
  /** Requests a route change to another category (`#/gear/<slug>`). */
  onCategoryChange: (category: GearListKey) => void;
}

/**
 * Gear tab (plan A2 / D3): six independent lists behind a category pill row, each a master–detail
 * view. The route owns the category; the store remembers it for the tab bar and deep links.
 */
export function GearPage({ category, onCategoryChange }: GearPageProps) {
  const storedCategory = useAppStore((state) => state.ui.gearCategory);
  const actions = useActions();
  const effective = category ?? storedCategory;

  useEffect(() => {
    if (storedCategory !== effective) {
      actions.setGearCategory(effective);
    }
  }, [actions, effective, storedCategory]);

  return (
    <div className="flex flex-col gap-3.5">
      <CategoryPills active={effective} onChange={onCategoryChange} />
      <GearCategoryView key={effective} category={effective} />
    </div>
  );
}
