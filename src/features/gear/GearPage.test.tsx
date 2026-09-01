// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild, type GearListKey } from '@/domain/build';
import { createMemoryStorage } from '@/persistence';
import { createAppStore, StoreProvider } from '@/state';

import { GearPage } from './GearPage';

const data = loadBundledGameData();
const ORACLE = 54987;

function mount(category: GearListKey = 'weapons') {
  const store = createAppStore(
    { data, storage: createMemoryStorage(), now: () => 1 },
    createDefaultBuild(data),
  );
  const onCategoryChange = vi.fn();

  render(
    <StoreProvider store={store} data={data}>
      <GearPage category={category} onCategoryChange={onCategoryChange} />
    </StoreProvider>,
  );

  return { store, onCategoryChange };
}

afterEach(cleanup);

describe('GearPage', () => {
  it('lists a configured weapon with its auto name and shows the ultimate editor cards', () => {
    const { store } = mount('weapons');
    const { actions } = store.getState();

    act(() => {
      const id = actions.addEntry('weapons');
      actions.setWeaponItem(id, ORACLE);
      actions.setWeaponUpgrade(id, 10);
    });

    const row = screen.getByRole('option', { name: /Oracle \+10/ });

    expect(row.textContent).toContain('Oracle +10');
    expect(screen.getByText('Ultimate random stats')).toBeTruthy();
    expect(screen.getByText('Ultimate jewels')).toBeTruthy();
    expect(screen.getByText('0 / 10 slots at +10')).toBeTruthy();
  });

  it('keeps the store category in sync and routes pill clicks', () => {
    const { store, onCategoryChange } = mount('weapons');

    expect(store.getState().ui.gearCategory).toBe('weapons');

    fireEvent.click(screen.getByRole('tab', { name: /Shields/ }));

    expect(onCategoryChange).toHaveBeenCalledWith('shields');
  });

  it('adds an entry through the dashed add card and selects it', () => {
    const { store } = mount('pets');

    fireEvent.click(screen.getByRole('button', { name: /\+ Add pet/ }));

    const pets = store.getState().build.pets;

    expect(pets).toHaveLength(1);
    expect(store.getState().ui.selected.pets).toBe(pets[0]?.id);
    // A new pet defaults to the first pet in data order at its maximum reachable total.
    expect(screen.getByText(/Every reachable total, sorted descending — max \d+/)).toBeTruthy();
  });
});
