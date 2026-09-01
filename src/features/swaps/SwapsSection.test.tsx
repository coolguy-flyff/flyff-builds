// @vitest-environment jsdom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { CLASS_IDS } from '@/data';
import { renderWithStore } from '@/features/buffs/renderWithStore';
import { createTestStore } from '@/features/buffs/testStore';
import type { AppStoreApi } from '@/state';

import { SwapsSection } from './SwapsSection';

const ORACLE = 54987; // two-handed stick
const AZURE_SHIELD = 469;
const HOTTER_SWORD = 2126; // one-handed
const OBSIDIAN_SWORD = 2434; // one-handed
const FIRST_SWAP = 2;

function addWeapon(store: AppStoreApi, itemId: number): number {
  const { actions } = store.getState();
  const id = actions.addEntry('weapons');
  actions.setWeaponItem(id, itemId);

  return id;
}

afterEach(cleanup);

describe('offhand rule', () => {
  it('disables the offhand for a two-handed weapon and flags a stored shield', () => {
    const store = createTestStore();
    const { actions } = store.getState();
    const weaponId = addWeapon(store, ORACLE);
    const shieldId = actions.addEntry('shields');
    actions.setShieldItem(shieldId, AZURE_SHIELD);
    actions.updateEntry('gearSwaps', FIRST_SWAP, (swap) => {
      swap.weaponId = weaponId;
      swap.offhand = { kind: 'shield', id: shieldId };
    });
    renderWithStore(<SwapsSection />, store);

    expect(screen.getByLabelText('Offhand')).toHaveProperty('disabled', true);
    expect(screen.getByText('2H weapon — no offhand')).toBeDefined();
    expect(screen.getByText('Offhand ignored: two-handed weapon equipped')).toBeDefined();
  });

  it('offers a Slayer the other one-handed weapons and stores the pick as a weapon offhand', () => {
    const store = createTestStore();
    const { actions } = store.getState();
    actions.setJob(CLASS_IDS.slayer);
    const mainhand = addWeapon(store, HOTTER_SWORD);
    const second = addWeapon(store, OBSIDIAN_SWORD);
    actions.updateEntry('gearSwaps', FIRST_SWAP, (swap) => {
      swap.weaponId = mainhand;
    });
    renderWithStore(<SwapsSection />, store);

    const offhand = screen.getByLabelText<HTMLSelectElement>('Offhand');

    expect(offhand.disabled).toBe(false);
    expect([...offhand.options].map((option) => option.textContent)).toEqual([
      '— none —',
      'Bloody Obsidian Sword +0',
    ]);

    fireEvent.change(offhand, { target: { value: String(second) } });

    expect(store.getState().build.gearSwaps[0]?.offhand).toEqual({ kind: 'weapon', id: second });
  });
});

describe('swap list', () => {
  it('adds a swap, expands it, and expands a collapsed swap on click', () => {
    const store = createTestStore();
    renderWithStore(<SwapsSection />, store);

    fireEvent.click(screen.getByRole('button', { name: /Add swap/ }));

    const swaps = store.getState().build.gearSwaps;

    expect(swaps).toHaveLength(2);
    expect(store.getState().ui.expandedSwapId).toBe(swaps[1]?.id);

    fireEvent.click(screen.getByRole('button', { name: 'Expand Swap 1' }));

    expect(store.getState().ui.expandedSwapId).toBe(FIRST_SWAP);
    expect(screen.getByRole('button', { name: 'Expand Swap 2' })).toBeDefined();
  });

  it('excludes a swap from results and shows it dimmed when collapsed', () => {
    const store = createTestStore();
    renderWithStore(<SwapsSection />, store);

    fireEvent.click(screen.getByLabelText('In results'));

    expect(store.getState().build.gearSwaps[0]?.includeInResults).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: /Add swap/ }));

    expect(screen.getByText('excluded from results')).toBeDefined();
  });

  it('keeps the last swap and disables its Delete button', () => {
    const store = createTestStore();
    renderWithStore(<SwapsSection />, store);

    const remove = screen.getByRole('button', { name: 'Delete' });

    expect(remove).toHaveProperty('disabled', true);
    expect(remove.getAttribute('title')).toBe('At least one swap is required');
  });
});
