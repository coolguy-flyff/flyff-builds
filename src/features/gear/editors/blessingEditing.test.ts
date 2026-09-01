import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { isReachableBlessingTotal } from '@/domain/rules';

import {
  addBlessingLine,
  maxBlessingTotal,
  withBlessingParameter,
  withBlessingTotal,
} from './blessingEditing';

const data = loadBundledGameData();

describe('blessing line editing', () => {
  it('adds the next unused stat at its maximum total', () => {
    const first = addBlessingLine(data, []);

    expect(first).toEqual([{ parameter: 'str', total: maxBlessingTotal(data, 'str') }]);

    const second = addBlessingLine(data, first);

    expect(second[1]?.parameter).toBe('dex');
  });

  it('snaps the total when the stat changes', () => {
    const lines = [{ parameter: 'str', total: 40 }];
    const changed = withBlessingParameter(data, lines, 0, 'criticalchance');

    expect(changed).toHaveLength(1);
    expect(changed[0]?.parameter).toBe('criticalchance');
    expect(isReachableBlessingTotal(data, 'criticalchance', changed[0]?.total ?? -1)).toBe(true);
  });

  it('merges duplicate stats into one line with a reachable combined total', () => {
    const lines = [
      { parameter: 'str', total: 10 },
      { parameter: 'sta', total: 20 },
    ];
    const merged = withBlessingParameter(data, lines, 1, 'str');

    expect(merged).toHaveLength(1);
    expect(merged[0]?.parameter).toBe('str');
    expect(merged[0]?.total).toBe(30);
  });

  it('writes totals per line', () => {
    const lines = [{ parameter: 'str', total: 10 }];

    expect(withBlessingTotal(lines, 0, 25)).toEqual([{ parameter: 'str', total: 25 }]);
  });
});
