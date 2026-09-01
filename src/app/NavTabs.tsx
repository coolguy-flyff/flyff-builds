import type { KeyboardEvent } from 'react';

import { GEAR_LIST_KEYS, type Issue } from '@/domain/build';
import { CountBadge, WarningBadge } from '@/components/Chip';
import { cx } from '@/lib/cx';
import { useAppStoreShallow, useBuild, useSelectors } from '@/state';

import { navigate } from './router';
import type { Route, TabId } from './routes';

interface TabSpec {
  readonly id: TabId;
  readonly label: string;
}

const TABS: readonly TabSpec[] = [
  { id: 'character', label: 'Character' },
  { id: 'gear', label: 'Gear' },
  { id: 'buffs', label: 'Buffs & Swaps' },
  { id: 'results', label: 'Results' },
];

function warningsByTab(issues: readonly Issue[]): Record<TabId, number> {
  const counts: Record<TabId, number> = { character: 0, gear: 0, buffs: 0, results: 0 };
  const gearLists = new Set<string>(GEAR_LIST_KEYS);

  for (const issue of issues) {
    const { list } = issue.target;

    if (list === 'statPages' || list === 'character') {
      counts.character += 1;
    } else if (list === 'gearSwaps') {
      counts.buffs += 1;
    } else if (gearLists.has(list)) {
      counts.gear += 1;
    }
  }

  return counts;
}

function tabElementId(id: TabId): string {
  return `tab-${id}`;
}

/**
 * Tab bar with entry-count and warning badges (plan A0.1 / D2). Below `md` it docks to the bottom
 * of the viewport as a mobile bar. Arrow keys, Home and End move between tabs.
 */
export function NavTabs({ route }: { route: Route }) {
  const build = useBuild();
  const selectors = useSelectors();
  const { gearCategory, gearCount, swapCount } = useAppStoreShallow((state) => ({
    gearCategory: state.ui.gearCategory,
    gearCount: GEAR_LIST_KEYS.reduce((total, key) => total + state.build[key].length, 0),
    swapCount: state.build.gearSwaps.length,
  }));
  const warnings = warningsByTab(selectors.issues(build));
  const counts: Partial<Record<TabId, number>> = { gear: gearCount, buffs: swapCount };

  const routeFor = (id: TabId): Route => {
    let target: Route;

    switch (id) {
      case 'character':
        target = { tab: 'character' };
        break;
      case 'gear':
        target = { tab: 'gear', category: gearCategory };
        break;
      case 'buffs':
        target = { tab: 'buffs' };
        break;
      case 'results':
        target = { tab: 'results' };
        break;
    }

    return target;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    const index = TABS.findIndex((tab) => tab.id === route.tab);
    let next: TabSpec | undefined;

    if (event.key === 'ArrowRight') {
      next = TABS[(index + 1) % TABS.length];
    } else if (event.key === 'ArrowLeft') {
      next = TABS[(index + TABS.length - 1) % TABS.length];
    } else if (event.key === 'Home') {
      next = TABS[0];
    } else if (event.key === 'End') {
      next = TABS[TABS.length - 1];
    }

    if (next !== undefined) {
      event.preventDefault();
      navigate(routeFor(next.id));
      document.getElementById(tabElementId(next.id))?.focus();
    }
  };

  return (
    <nav
      role="tablist"
      aria-label="Sections"
      onKeyDown={onKeyDown}
      className="bg-band px-4 py-2.5 max-md:fixed max-md:inset-x-0 max-md:bottom-0 max-md:z-30 max-md:border-t max-md:border-white/5 md:px-6"
    >
      <div className="mx-auto flex w-full max-w-[1400px] flex-wrap gap-1 max-md:justify-around">
        {TABS.map((tab) => {
          const active = tab.id === route.tab;
          const count = counts[tab.id];
          const warningCount = warnings[tab.id];

          return (
            <button
              key={tab.id}
              id={tabElementId(tab.id)}
              type="button"
              role="tab"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => {
                navigate(routeFor(tab.id));
              }}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-[13.5px] transition-colors md:px-4',
                active
                  ? 'bg-accent font-semibold text-on-accent'
                  : 'font-medium text-text-2 hover:bg-white/5 hover:text-text',
              )}
            >
              {tab.label}
              {count !== undefined && count > 0 && <CountBadge count={count} onAccent={active} />}
              {warningCount > 0 && (
                <WarningBadge
                  count={warningCount}
                  title={`${warningCount} validation issue${warningCount === 1 ? '' : 's'}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
