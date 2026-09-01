import { useSyncExternalStore } from 'react';

import { STORAGE_KEYS } from '@/persistence';

import { parseRoute, routeToHash, type Route } from './routes';

function subscribe(onChange: () => void): () => void {
  window.addEventListener('hashchange', onChange);

  return () => {
    window.removeEventListener('hashchange', onChange);
  };
}

function getSnapshot(): string {
  return window.location.hash;
}

function getServerSnapshot(): string {
  return '';
}

/** The parsed hash route, or `null` when the hash is empty or unknown. */
export function useHashRoute(): Route | null {
  return parseRoute(useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot));
}

export function navigate(route: Route, replace = false): void {
  const hash = routeToHash(route);

  if (replace) {
    window.history.replaceState(null, '', hash);
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  } else {
    window.location.hash = hash;
  }
}

/** Remembers the last visited route so a bare URL reopens where the user left off. */
export function rememberRoute(route: Route): void {
  try {
    window.localStorage.setItem(STORAGE_KEYS.lastRoute, routeToHash(route));
  } catch {
    // Remembering the tab is a convenience; a blocked localStorage must not break navigation.
  }
}

export function recallRoute(): Route | null {
  let route: Route | null = null;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEYS.lastRoute);
    route = stored === null ? null : parseRoute(stored);
  } catch {
    // Same as above: fall back to the default route.
  }

  return route;
}
