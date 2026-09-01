import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { isValidStatAwake } from '@/domain/rules';

import { normalizeStatAwake } from './statAwakeEditing';

const data = loadBundledGameData();

describe('normalizeStatAwake', () => {
  it('clears both lines when the first is empty', () => {
    expect(normalizeStatAwake(data, null, { stat: 'sta', value: 2 })).toEqual([null, null]);
  });

  it('keeps a valid single line and snaps out-of-table values', () => {
    expect(normalizeStatAwake(data, { stat: 'str', value: 4 }, null)).toEqual([
      { stat: 'str', value: 4 },
      null,
    ]);
    expect(normalizeStatAwake(data, { stat: 'str', value: 9 }, null)).toEqual([
      { stat: 'str', value: 4 },
      null,
    ]);
  });

  it('drops a partner the table does not pair', () => {
    expect(normalizeStatAwake(data, { stat: 'str', value: 2 }, { stat: 'int', value: 1 })).toEqual([
      { stat: 'str', value: 2 },
      null,
    ]);
  });

  it('snaps pairs to a valid combination, preferring the edited line', () => {
    const fromFirst = normalizeStatAwake(
      data,
      { stat: 'str', value: 4 },
      { stat: 'sta', value: 4 },
      'first',
    );

    expect(isValidStatAwake(data, fromFirst)).toBe(true);
    expect(fromFirst[0]).toEqual({ stat: 'str', value: 3 });

    const fromSecond = normalizeStatAwake(
      data,
      { stat: 'str', value: 4 },
      { stat: 'sta', value: 3 },
      'second',
    );

    expect(isValidStatAwake(data, fromSecond)).toBe(true);
    expect(fromSecond[1]).toEqual({ stat: 'sta', value: 3 });
  });

  it('always produces awakes the table accepts', () => {
    const stats = ['str', 'sta', 'dex', 'int'] as const;

    for (const first of stats) {
      for (const second of stats) {
        for (let firstValue = 1; firstValue <= 4; firstValue += 1) {
          for (let secondValue = 1; secondValue <= 4; secondValue += 1) {
            const awake = normalizeStatAwake(
              data,
              { stat: first, value: firstValue },
              { stat: second, value: secondValue },
            );

            expect(isValidStatAwake(data, awake)).toBe(true);
          }
        }
      }
    }
  });
});
