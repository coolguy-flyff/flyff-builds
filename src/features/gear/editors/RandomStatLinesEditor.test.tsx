// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { loadBundledGameData, requireItem } from '@/data';
import { createDefaultBuild, defaultRandomStatLines, type RandomStatLine } from '@/domain/build';
import { createMemoryStorage } from '@/persistence';
import { createAppStore, StoreProvider } from '@/state';

import { RandomStatLinesEditor } from './RandomStatLinesEditor';

const data = loadBundledGameData();
const ORACLE = 54987;

function mount(upgrade: number, initial: (RandomStatLine | null)[]) {
  const item = requireItem(data, ORACLE);
  const seen: (RandomStatLine | null)[][] = [];

  function Harness() {
    const [lines, setLines] = useState(initial);

    return (
      <RandomStatLinesEditor
        label="Random stat"
        item={item}
        upgrade={upgrade}
        lines={lines}
        onChange={(next) => {
          seen.push(next);
          setLines(next);
        }}
      />
    );
  }

  const store = createAppStore(
    { data, storage: createMemoryStorage(), now: () => 1 },
    createDefaultBuild(data),
  );

  render(
    <StoreProvider store={store} data={data}>
      <Harness />
    </StoreProvider>,
  );

  return seen;
}

afterEach(cleanup);

describe('RandomStatLinesEditor', () => {
  it('greys and disables lines locked by the upgrade but keeps their values', () => {
    const item = requireItem(data, ORACLE);
    // Stale stored lines (upgrade changes clear locked lines, but old builds may carry them).
    mount(5, defaultRandomStatLines(item, 10));

    const line3 = screen.getByLabelText('Random stat line 3 stat');
    const line4Value = screen.getByLabelText('Random stat line 4 value');

    expect(line3.hasAttribute('disabled')).toBe(true);
    expect(line4Value.hasAttribute('disabled')).toBe(true);
    // The locked line keeps its stored stat.
    expect(line3).toHaveProperty('value', 'maxhp');
  });

  it('resets the value to the stat midpoint when a line changes stat', () => {
    const item = requireItem(data, ORACLE);
    mount(10, defaultRandomStatLines(item, 10));

    fireEvent.change(screen.getByLabelText('Random stat line 1 stat'), {
      target: { value: 'int' },
    });

    // INT rolls 3–12; the midpoint is floor(3 + 4.5) = 7.
    expect(screen.getByLabelText('Random stat line 1 value')).toHaveProperty('ariaValueText', '+7');
  });

  it('disables stats already used on another unlocked line', () => {
    const item = requireItem(data, ORACLE);
    mount(10, defaultRandomStatLines(item, 10));

    const line1 = screen.getByLabelText<HTMLSelectElement>('Random stat line 1 stat');
    const line2 = screen.getByLabelText<HTMLSelectElement>('Random stat line 2 stat');
    const options = within(line1).getAllByRole<HTMLOptionElement>('option');
    const usedByLine2 = options.find((candidate) => candidate.value === line2.value);
    const ownStat = options.find((candidate) => candidate.value === line1.value);

    expect(usedByLine2?.disabled).toBe(true);
    expect(ownStat?.disabled).toBe(false);
  });

  it('never lets a locked line block a stat: picking it clears the locked line', () => {
    const item = requireItem(data, ORACLE);
    const filled = defaultRandomStatLines(item, 10);
    const lockedStat = filled[2]?.parameter;

    if (lockedStat === undefined) {
      throw new Error('fixture line 3 missing');
    }

    // At +5 only lines 1–2 are unlocked; line 3 still holds `lockedStat`.
    const seen = mount(5, filled);
    const line1 = screen.getByLabelText<HTMLSelectElement>('Random stat line 1 stat');
    const option = within(line1)
      .getAllByRole<HTMLOptionElement>('option')
      .find((candidate) => candidate.value === lockedStat);

    expect(option?.disabled).toBe(false);

    fireEvent.change(line1, { target: { value: lockedStat } });

    const last = seen[seen.length - 1];

    expect(last?.[0]?.parameter).toBe(lockedStat);
    expect(last?.[2] ?? null).toBeNull();
  });
});
