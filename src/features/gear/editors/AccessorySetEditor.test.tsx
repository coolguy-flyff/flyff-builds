// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild, type AccessorySetEntry } from '@/domain/build';
import { requireDefined } from '@/lib/assert';
import { createMemoryStorage } from '@/persistence';
import { createAppStore, StoreProvider } from '@/state';

import { GearPage } from '../GearPage';

const data = loadBundledGameData();
const ADEPTS_SET = 12670;
const DEFENDERS_SET = 16809;
/** The Speedo earring line ("Speedo +1" … "Speedo +5"). */
const SPEEDO_LINE = 2470;

function mount() {
  const store = createAppStore(
    { data, storage: createMemoryStorage(), now: () => 1 },
    createDefaultBuild(data),
  );

  render(
    <StoreProvider store={store} data={data}>
      <GearPage category="accessorySets" onCategoryChange={vi.fn()} />
    </StoreProvider>,
  );

  const { actions } = store.getState();
  let entryId = 0;

  act(() => {
    entryId = actions.addEntry('accessorySets');
    actions.updateEntry('accessorySets', entryId, (entry) => {
      entry.setId = ADEPTS_SET;
    });
  });

  const entry = (): AccessorySetEntry =>
    requireDefined(
      store.getState().build.accessorySets.find((candidate) => candidate.id === entryId),
      'entry',
    );

  return { entry };
}

function pickSource(label: string, sourceId: number): void {
  fireEvent.change(screen.getByLabelText(label), { target: { value: String(sourceId) } });
}

afterEach(cleanup);

describe('AccessorySetEditor — mix & match', () => {
  it('shows the per-piece source selects only while mixing, without a "Same" option', () => {
    mount();

    expect(screen.queryByLabelText('Ring 2 source')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'mix & match ▾' }));

    expect(screen.getByLabelText('Ring 2 source')).toBeDefined();
    expect(
      screen.getByText('each piece from its own set or CW jewel — set bonuses count per set'),
    ).toBeDefined();
    expect(screen.queryByRole('option', { name: /Same/ })).toBeNull();
    // Speedo is an earring line: offered for both earrings, for nothing else.
    expect(screen.getAllByRole('option', { name: 'Speedo' })).toHaveLength(2);
    expect(screen.queryByRole('option', { name: 'Pep' })).not.toBeNull();
    expect(screen.getAllByRole('option', { name: 'Pep' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: 'done mixing ▴' }));

    expect(screen.queryByLabelText('Ring 2 source')).toBeNull();
  });

  it('stores a piece source, names the mix, and locks the step until the mix is undone', () => {
    const { entry } = mount();

    fireEvent.click(screen.getByRole('button', { name: 'mix & match ▾' }));
    pickSource('Ring 2 source', DEFENDERS_SET);

    expect(entry().pieceSources.ring2).toBe(DEFENDERS_SET);
    expect(screen.getByRole('option', { name: /Adept\/Def/ })).toBeDefined();
    expect(screen.getByRole('button', { name: 'mixed set' })).toHaveProperty('disabled', true);

    // Adept's has no Peision necklace; a Defender's necklace does.
    expect(screen.queryByRole('radio', { name: 'Peision' })).toBeNull();
    pickSource('Necklace source', DEFENDERS_SET);
    expect(screen.getByRole('radio', { name: 'Peision' })).toBeDefined();

    // Taking the pieces from Adept's again is the unmixed state, and the step can close.
    pickSource('Ring 2 source', ADEPTS_SET);
    pickSource('Necklace source', ADEPTS_SET);
    expect(entry().pieceSources.ring2).toBeNull();
    expect(screen.getByRole('button', { name: 'done mixing ▴' })).toBeDefined();
  });

  it('wears a CW jewel at its own tiers and drops the set-only variant control', () => {
    const { entry } = mount();

    fireEvent.click(screen.getByRole('button', { name: 'mix & match ▾' }));
    expect(screen.getAllByRole('radio', { name: 'Plug' })).toHaveLength(2);

    pickSource('Earring 2 source', SPEEDO_LINE);

    // Speedo only exists at +1…+5: the +0 default moves to +1 and the stepper stops at +5.
    expect(entry().pieceSources.earring2).toBe(SPEEDO_LINE);
    expect(entry().upgrades.earring2).toBe(1);
    expect(screen.getAllByRole('radio', { name: 'Plug' })).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: /Decrease Earring 2 upgrade/ }));
    expect(entry().upgrades.earring2).toBe(1);

    for (let step = 0; step < 6; step += 1) {
      fireEvent.click(screen.getByRole('button', { name: /Increase Earring 2 upgrade/ }));
    }

    expect(entry().upgrades.earring2).toBe(5);
  });
});
