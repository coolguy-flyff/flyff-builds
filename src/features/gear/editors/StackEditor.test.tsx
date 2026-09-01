// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { cardShortName, createDefaultBuild, type Stack } from '@/domain/build';
import { createMemoryStorage } from '@/persistence';
import { createAppStore, StoreProvider } from '@/state';

import { StackEditor } from './StackEditor';

const data = loadBundledGameData();
const LAND_A = 5666;

function Harness({ initial, capacity }: { initial: Stack[]; capacity: number }) {
  const [stacks, setStacks] = useState(initial);

  return (
    <StackEditor
      title="Piercing cards"
      noun="card"
      options={data.weaponCards}
      stacks={stacks}
      capacity={capacity}
      shorten={cardShortName}
      onChange={setStacks}
    />
  );
}

function mount(initial: Stack[], capacity = 5) {
  const store = createAppStore(
    { data, storage: createMemoryStorage(), now: () => 1 },
    createDefaultBuild(data),
  );

  render(
    <StoreProvider store={store} data={data}>
      <Harness initial={initial} capacity={capacity} />
    </StoreProvider>,
  );
}

afterEach(cleanup);

describe('StackEditor', () => {
  it('shows the used capacity and caps the count stepper at the free slots', () => {
    mount([{ itemId: LAND_A, count: 3 }]);

    expect(screen.getByText('3 / 5 used')).toBeTruthy();

    const increase = screen.getByLabelText('Increase Land Card (A) count');
    fireEvent.click(increase);
    fireEvent.click(increase);

    expect(screen.getByText('5 / 5 used')).toBeTruthy();
    expect(increase.hasAttribute('disabled')).toBe(true);
  });

  it('fills the remaining slots with the last stack', () => {
    mount([{ itemId: LAND_A, count: 2 }]);

    fireEvent.click(screen.getByRole('button', { name: 'Fill remaining with last' }));

    expect(screen.getByText('5 / 5 used')).toBeTruthy();
    expect(screen.getByLabelText('Land Card (A) count')).toHaveProperty('value', '5');
  });

  it('clears every stack', () => {
    mount([{ itemId: LAND_A, count: 4 }]);

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }));

    expect(screen.getByText('0 / 5 used')).toBeTruthy();
    expect(screen.queryByLabelText('Land Card (A) count')).toBeNull();
  });

  it('keeps over-capacity stacks stored and flags the excess', () => {
    mount([{ itemId: LAND_A, count: 7 }]);

    expect(screen.getByText('7 / 5 used')).toBeTruthy();
    expect(screen.getByText(/2 cards beyond the 5 available slots/)).toBeTruthy();
    expect(screen.getByLabelText('Land Card (A) count')).toHaveProperty('value', '7');
  });
});
