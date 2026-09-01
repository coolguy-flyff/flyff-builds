import { describe, expect, it } from 'vitest';

import { parseRoute, routeToHash } from './routes';

describe('routes', () => {
  it('parses every tab and gear category', () => {
    expect(parseRoute('#/character')).toEqual({ tab: 'character' });
    expect(parseRoute('#/gear')).toEqual({ tab: 'gear', category: null });
    expect(parseRoute('#/gear/accessories')).toEqual({ tab: 'gear', category: 'accessorySets' });
    expect(parseRoute('#/buffs/')).toEqual({ tab: 'buffs' });
    expect(parseRoute('#results')).toEqual({ tab: 'results' });
  });

  it('rejects unknown paths', () => {
    expect(parseRoute('')).toBeNull();
    expect(parseRoute('#/nope')).toBeNull();
    expect(parseRoute('#/gear/hats')).toBeNull();
  });

  it('round-trips through routeToHash', () => {
    const hashes = ['#/character', '#/gear', '#/gear/fashion', '#/buffs', '#/results'];

    for (const hash of hashes) {
      const route = parseRoute(hash);

      expect(route).not.toBeNull();

      if (route !== null) {
        expect(routeToHash(route)).toBe(hash);
      }
    }
  });
});
