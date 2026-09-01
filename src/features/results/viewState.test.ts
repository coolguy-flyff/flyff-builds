import { describe, expect, it } from 'vitest';

import { effectiveBaseline, setMembership, toggleMembership } from './viewState';

describe('setMembership / toggleMembership', () => {
  it('adds once, removes, and toggles', () => {
    expect(setMembership([1, 2], 3, true)).toEqual([1, 2, 3]);
    expect(setMembership([1, 2, 3], 3, true)).toEqual([1, 2, 3]);
    expect(setMembership([1, 2, 3], 2, false)).toEqual([1, 3]);
    expect(toggleMembership(['base'], 'base')).toEqual([]);
    expect(toggleMembership(['base'], 'raw')).toEqual(['base', 'raw']);
  });
});

describe('effectiveBaseline', () => {
  it('only keeps a baseline whose column is visible', () => {
    expect(effectiveBaseline(null, [1, 2])).toBeNull();
    expect(effectiveBaseline(2, [1, 2])).toBe(2);
    expect(effectiveBaseline(3, [1, 2])).toBeNull();
  });
});
