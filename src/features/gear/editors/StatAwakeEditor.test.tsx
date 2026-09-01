// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild, type SetStatAwake, type StatAwake } from '@/domain/build';
import { isValidSetStatAwake, isValidStatAwake } from '@/domain/rules';
import { createMemoryStorage } from '@/persistence';
import { createAppStore, StoreProvider } from '@/state';

import { SetStatAwakeEditor } from './SetStatAwakeEditor';
import { StatAwakeEditor } from './StatAwakeEditor';

const data = loadBundledGameData();

function renderWithStore(node: React.ReactElement) {
  const store = createAppStore(
    { data, storage: createMemoryStorage(), now: () => 1 },
    createDefaultBuild(data),
  );

  render(
    <StoreProvider store={store} data={data}>
      {node}
    </StoreProvider>,
  );
}

function mount(initial: StatAwake) {
  const seen: StatAwake[] = [];

  function Harness() {
    const [awake, setAwake] = useState<StatAwake>(initial);

    return (
      <StatAwakeEditor
        label="Awake"
        awake={awake}
        onChange={(next) => {
          seen.push(next);
          setAwake(next);
        }}
      />
    );
  }

  renderWithStore(<Harness />);

  return seen;
}

function mountSet(initial: SetStatAwake) {
  const seen: SetStatAwake[] = [];

  function Harness() {
    const [awake, setAwake] = useState<SetStatAwake>(initial);

    return (
      <SetStatAwakeEditor
        label="Awake"
        awake={awake}
        onChange={(next) => {
          seen.push(next);
          setAwake(next);
        }}
      />
    );
  }

  renderWithStore(<Harness />);

  return seen;
}

afterEach(cleanup);

describe('StatAwakeEditor', () => {
  it('offers only valid partners on the second line', () => {
    mount([{ stat: 'str', value: 2 }, null]);

    const partnerSelect = screen.getByLabelText('Awake line 2 stat');

    expect(within(partnerSelect).getByRole('option', { name: 'STA' })).toBeTruthy();
    expect(within(partnerSelect).getByRole('option', { name: 'DEX' })).toBeTruthy();
    expect(within(partnerSelect).queryByRole('option', { name: 'INT' })).toBeNull();
  });

  it('keeps the awake valid when a partner is chosen', () => {
    const seen = mount([{ stat: 'str', value: 2 }, null]);

    fireEvent.change(screen.getByLabelText('Awake line 2 stat'), { target: { value: 'sta' } });

    const last = seen[seen.length - 1];

    expect(last?.[1]?.stat).toBe('sta');
    expect(last === undefined ? false : isValidStatAwake(data, last)).toBe(true);
  });

  it('hides the second line at a +4 single (no valid dual with a 4)', () => {
    mount([{ stat: 'sta', value: 4 }, null]);

    expect(screen.queryByLabelText('Awake line 2 stat')).toBeNull();
  });

  it('drops the partner when the first value is raised to +4', () => {
    const seen = mount([
      { stat: 'str', value: 3 },
      { stat: 'sta', value: 2 },
    ]);

    const slider = screen.getByLabelText('Awake line 1 value');
    fireEvent.change(slider, { target: { value: '3' } });

    expect(seen[seen.length - 1]).toEqual([{ stat: 'str', value: 4 }, null]);
  });

  it('clears both lines when the first stat is set to none', () => {
    const seen = mount([
      { stat: 'str', value: 2 },
      { stat: 'sta', value: 2 },
    ]);

    fireEvent.change(screen.getByLabelText('Awake line 1 stat'), { target: { value: '' } });

    expect(seen[seen.length - 1]).toEqual([null, null]);
  });
});

describe('SetStatAwakeEditor', () => {
  it('hides the second line at the full +16 total', () => {
    mountSet([{ stat: 'sta', value: 16 }, null]);

    expect(screen.queryByLabelText('Awake line 2 stat')).toBeNull();
  });

  it('offers a second stat with reachable totals below +16', () => {
    const seen = mountSet([{ stat: 'sta', value: 12 }, null]);

    fireEvent.change(screen.getByLabelText('Awake line 2 stat'), { target: { value: 'int' } });

    const last = seen[seen.length - 1];

    // STA 12 = 3 per piece; every piece can pair INT up to 2 → INT max 8, defaulting to the max.
    expect(last).toEqual([
      { stat: 'sta', value: 12 },
      { stat: 'int', value: 8 },
    ]);
    expect(last === undefined ? false : isValidSetStatAwake(data, last)).toBe(true);
  });

  it('snaps the second total when the first total rises', () => {
    const seen = mountSet([
      { stat: 'sta', value: 12 },
      { stat: 'int', value: 8 },
    ]);

    // Raise STA 12 → 14; INT can then reach at most 4.
    const slider = screen.getByLabelText('Awake line 1 total');
    fireEvent.change(slider, { target: { value: '13' } });

    const last = seen[seen.length - 1];

    expect(last?.[0]).toEqual({ stat: 'sta', value: 14 });
    expect(last === undefined ? false : isValidSetStatAwake(data, last)).toBe(true);
  });
});
