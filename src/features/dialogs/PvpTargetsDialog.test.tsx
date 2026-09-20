// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { createMemoryStorage } from '@/persistence';
import { createAppStore, StoreProvider, type AppStoreApi } from '@/state';

import { PvpTargetsDialog } from './PvpTargetsDialog';

const data = loadBundledGameData();

function mount(): AppStoreApi {
  const store = createAppStore(
    { data, storage: createMemoryStorage(), now: () => 1 },
    createDefaultBuild(data),
  );

  render(
    <StoreProvider store={store} data={data}>
      <PvpTargetsDialog onClose={vi.fn()} />
    </StoreProvider>,
  );

  return store;
}

function targetSelect(): HTMLSelectElement {
  return screen.getByLabelText<HTMLSelectElement>('PvP target');
}

afterEach(cleanup);

describe('PvpTargetsDialog', () => {
  it('shows the first preset read-only when the results hit the dummy', () => {
    mount();

    expect(targetSelect().value).toBe('preset:squishy');
    expect(screen.getByLabelText<HTMLInputElement>('Defense').disabled).toBe(true);
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull();
    expect(screen.queryByLabelText('Name')).toBeNull();
    expect(screen.getByText(/cannot be edited/)).toBeDefined();
  });

  it('duplicates the shown target into the build, picks it, edits it and deletes it', () => {
    const store = mount();

    fireEvent.click(screen.getByRole('button', { name: 'Duplicate' }));

    const created = store.getState().build.pvpTargets[0];
    const id = created?.id;

    expect(created).toMatchObject({ name: 'Squishy copy', defense: 2000, criticalResist: 0 });
    expect(store.getState().ui.results.damageTarget).toEqual({ kind: 'custom', id });
    expect(targetSelect().value).toBe(`custom:${String(id)}`);
    expect(screen.getByLabelText<HTMLInputElement>('Defense').disabled).toBe(false);

    fireEvent.click(screen.getByLabelText('Increase Defense'));
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Guild tank' } });
    fireEvent.change(screen.getByLabelText('Crit resist'), { target: { value: '38' } });
    // The incoming damage slider runs from 0 on the left to −50 on the right.
    fireEvent.change(screen.getByLabelText('Incoming damage'), { target: { value: '10' } });

    expect(store.getState().build.pvpTargets[0]).toMatchObject({
      name: 'Guild tank',
      defense: 2001,
      criticalResist: 38,
      incomingDamage: -10,
    });
    expect(screen.getByRole('option', { name: 'Guild tank' })).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(store.getState().build.pvpTargets).toEqual([]);
    expect(store.getState().ui.results.damageTarget).toEqual({ kind: 'dummy' });
    expect(targetSelect().value).toBe('preset:squishy');
  });

  it('switches the results target when another entry is chosen', () => {
    const store = mount();

    fireEvent.change(targetSelect(), { target: { value: 'preset:tank' } });

    expect(store.getState().ui.results.damageTarget).toEqual({ kind: 'preset', id: 'tank' });
    // The Tank preset's defense, shown read-only.
    // The Tank preset's defense and magic defense are both 6000, shown read-only.
    expect(screen.getAllByDisplayValue('6000')).toHaveLength(2);
    expect(screen.getByText(/cannot be edited/)).toBeDefined();
  });
});
