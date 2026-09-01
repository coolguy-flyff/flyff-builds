import { GEAR_LIST_KEYS, type GearListKey } from '@/domain/build';

/** Hash routes (plan A0.1): `#/character`, `#/gear/:category`, `#/buffs`, `#/results`. */
export type Route =
  | { readonly tab: 'character' }
  | { readonly tab: 'gear'; readonly category: GearListKey | null }
  | { readonly tab: 'buffs' }
  | { readonly tab: 'results' };

export type TabId = Route['tab'];

export const DEFAULT_ROUTE: Route = { tab: 'character' };

export const GEAR_CATEGORY_SLUGS = {
  equipmentSets: 'equipment',
  weapons: 'weapons',
  shields: 'shields',
  accessorySets: 'accessories',
  fashionSets: 'fashion',
  pets: 'pets',
} as const satisfies Record<GearListKey, string>;

export function gearListKeyFromSlug(slug: string): GearListKey | undefined {
  return GEAR_LIST_KEYS.find((key) => GEAR_CATEGORY_SLUGS[key] === slug);
}

export function parseRoute(hash: string): Route | null {
  const path = hash.replace(/^#\/?/, '').replace(/\/+$/, '');
  const [head, second] = path.split('/');
  let route: Route | null = null;

  switch (head ?? '') {
    case 'character':
      route = { tab: 'character' };
      break;
    case 'buffs':
      route = { tab: 'buffs' };
      break;
    case 'results':
      route = { tab: 'results' };
      break;

    case 'gear': {
      if (second === undefined || second === '') {
        route = { tab: 'gear', category: null };
      } else {
        const category = gearListKeyFromSlug(second);

        if (category !== undefined) {
          route = { tab: 'gear', category };
        }
      }

      break;
    }

    default:
      break;
  }

  return route;
}

export function routeToHash(route: Route): string {
  let hash: string;

  switch (route.tab) {
    case 'character':
      hash = '#/character';
      break;
    case 'gear':
      hash = route.category === null ? '#/gear' : `#/gear/${GEAR_CATEGORY_SLUGS[route.category]}`;
      break;
    case 'buffs':
      hash = '#/buffs';
      break;
    case 'results':
      hash = '#/results';
      break;
  }

  return hash;
}
