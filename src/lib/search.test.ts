import { describe, expect, it } from 'vitest';

import { matchesQuery, normalizeSearchText } from './search';

describe('matchesQuery', () => {
  it('requires every token, case-insensitively', () => {
    expect(matchesQuery('Volcano Card (7%) maxhp', 'volc 7')).toBe(true);
    expect(matchesQuery('Volcano Card (7%) maxhp', 'volc ocean')).toBe(false);
  });

  it('normalises apostrophes and diacritics', () => {
    expect(matchesQuery('Adept’s Ring', "adept's")).toBe(true);
    expect(normalizeSearchText('Éclair')).toBe('eclair');
  });

  it('matches everything on a blank query', () => {
    expect(matchesQuery('anything', '   ')).toBe(true);
  });
});
