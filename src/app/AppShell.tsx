import { useEffect } from 'react';

import { BuffsPage } from '@/features/buffs/BuffsPage';
import { CharacterPage } from '@/features/character/CharacterPage';
import { DialogHost } from '@/features/dialogs/DialogHost';
import { GearPage } from '@/features/gear/GearPage';
import { ResultsPage } from '@/features/results/ResultsPage';
import { cx } from '@/lib/cx';
import { useActions, type AppActions } from '@/state';

import { AppFooter } from './AppFooter';
import { AppHeader } from './AppHeader';
import { NavTabs } from './NavTabs';
import { navigate, recallRoute, rememberRoute, useHashRoute } from './router';
import { DEFAULT_ROUTE, type Route } from './routes';
import { ToastHost } from './ToastHost';

function renderPage(route: Route, actions: AppActions) {
  let page;

  switch (route.tab) {
    case 'character':
      page = <CharacterPage />;
      break;
    case 'gear':
      page = (
        <GearPage
          category={route.category}
          onCategoryChange={(category) => {
            navigate({ tab: 'gear', category });
          }}
        />
      );
      break;
    case 'buffs':
      page = <BuffsPage />;
      break;
    case 'results':
      page = (
        <ResultsPage
          onOpenSwap={(swapId) => {
            if (swapId !== null) {
              actions.setExpandedSwap(swapId);
            }

            navigate({ tab: 'buffs' });
          }}
        />
      );
      break;
  }

  return page;
}

export function AppShell() {
  const parsed = useHashRoute();
  const actions = useActions();
  const route = parsed ?? recallRoute() ?? DEFAULT_ROUTE;

  useEffect(() => {
    if (parsed === null) {
      navigate(route, true);
    } else {
      rememberRoute(parsed);
    }
  }, [parsed, route]);

  return (
    <div className="flex min-h-screen flex-col bg-bg text-text">
      <div className="sticky top-0 z-30">
        <AppHeader />
        <NavTabs route={route} />
      </div>
      <main
        className={cx(
          'w-full flex-1 px-4 pt-[18px] pb-6 md:px-6',
          route.tab !== 'results' && 'mx-auto max-w-[1400px]',
        )}
      >
        {renderPage(route, actions)}
      </main>
      <AppFooter />
      <DialogHost />
      <ToastHost />
    </div>
  );
}
