// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CLASS_IDS, loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { requireDefined } from '@/lib/assert';
import { createMemoryStorage } from '@/persistence';
import { createAppStore, StoreProvider } from '@/state';

import { ResultsPage } from './ResultsPage';

const data = loadBundledGameData();
const ORACLE = 54987;

/** Headless UI's menu tracks button movement with ResizeObserver, which jsdom does not provide. */
class ResizeObserverStub {
  observe(): void {
    // jsdom has no layout, so there is nothing to observe.
  }

  unobserve(): void {
    // See observe().
  }

  disconnect(): void {
    // See observe().
  }
}

vi.stubGlobal('ResizeObserver', ResizeObserverStub);

/** Two swaps on the default Seraph: the first wields an Oracle, the second is bare-handed. */
function setup() {
  const store = createAppStore(
    { data, storage: createMemoryStorage(), now: () => 1 },
    createDefaultBuild(data),
  );
  const { actions } = store.getState();
  const firstSwapId = requireDefined(store.getState().build.gearSwaps[0], 'default swap').id;
  const secondSwapId = actions.addEntry('gearSwaps');
  const weaponId = actions.addEntry('weapons');

  actions.setWeaponItem(weaponId, ORACLE);
  actions.updateEntry('gearSwaps', firstSwapId, (swap) => {
    swap.weaponId = weaponId;
  });

  const opened: (number | null)[] = [];

  render(
    <StoreProvider store={store} data={data}>
      <ResultsPage
        onOpenSwap={(swapId) => {
          opened.push(swapId);
        }}
      />
    </StoreProvider>,
  );

  return { store, actions, firstSwapId, secondSwapId, weaponId, opened };
}

function rowCells(label: string): HTMLElement[] {
  const header = screen.getByRole('rowheader', { name: label });
  const row = requireDefined(header.closest('tr'), `row for ${label}`);

  return within(row).getAllByRole('cell');
}

function installClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  });
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ResultsPage', () => {
  it('renders one column per included swap with name and composition chips', () => {
    setup();

    expect(screen.getByRole('button', { name: '— / Oracle / Page 1' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Swap 2' })).toBeDefined();
    expect(screen.getAllByText('Oracle +0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Page 1').length).toBe(2);
    expect(screen.getByRole('rowheader', { name: 'Heal Rain (Lv 10)' })).toBeDefined();
  });

  it('shows different attack values and marks the higher one as best', () => {
    setup();
    const [withWeapon, bareHands] = rowCells('Attack');

    expect(withWeapon?.textContent).not.toBe(bareHands?.textContent);
    expect(withWeapon?.getAttribute('data-best')).toBe('true');
    expect(bareHands?.getAttribute('data-best')).toBeNull();

    for (const cell of rowCells('Max HP')) {
      expect(cell.getAttribute('data-best')).toBeNull();
    }
  });

  it('turns highlighting off with the toggle', () => {
    setup();

    fireEvent.click(screen.getByLabelText('Highlight best'));

    for (const cell of rowCells('Attack')) {
      expect(cell.getAttribute('data-best')).toBeNull();
    }
  });

  it('shows diffs against the chosen baseline column', () => {
    const { store, secondSwapId } = setup();

    fireEvent.change(screen.getByLabelText('Diff vs'), { target: { value: String(secondSwapId) } });

    expect(store.getState().ui.results.baselineSwapId).toBe(secondSwapId);

    const [withWeapon, baseline] = rowCells('Attack');
    const diff = withWeapon?.querySelector('[data-diff]');

    expect(diff?.textContent).toMatch(/^\+[\d,]+$/);
    expect(baseline?.querySelector('[data-diff]')).toBeNull();
    expect(rowCells('Max HP')[0]?.querySelector('[data-diff]')?.textContent).toBe('±0');
  });

  it('filters to differing rows only', () => {
    setup();

    fireEvent.click(screen.getByLabelText('Only differing rows'));

    expect(screen.queryByRole('rowheader', { name: 'Max HP' })).toBeNull();
    expect(screen.getByRole('rowheader', { name: 'Attack' })).toBeDefined();
  });

  it('adds the raw totals group on request', () => {
    const { store } = setup();

    expect(screen.queryByRole('button', { name: /Raw totals/ })).toBeNull();
    fireEvent.click(screen.getByLabelText('Show raw totals'));

    expect(store.getState().ui.results.showRawTotals).toBe(true);
    expect(screen.getByRole('button', { name: /Raw totals/ })).toBeDefined();
    // Base-stat STR plus the raw flat STR total (Beef Up) — the raw group adds a second row.
    expect(screen.getAllByRole('rowheader', { name: 'STR' }).length).toBe(2);
  });

  it('flags a column with issues and lists engine degradations as footnotes', () => {
    const { actions, firstSwapId } = setup();
    const shieldItemId = requireDefined(
      data.shieldsByJob.get(CLASS_IDS.seraph)?.[0],
      'a Seraph shield',
    ).id;

    act(() => {
      const shieldId = actions.addEntry('shields');

      actions.setShieldItem(shieldId, shieldItemId);
      actions.updateEntry('gearSwaps', firstSwapId, (swap) => {
        swap.offhand = { kind: 'shield', id: shieldId };
      });
    });

    const warning = screen.getByRole('img', { name: /issue/ });

    expect(warning.getAttribute('title')).toContain('Offhand ignored');
    expect(screen.getByText(/^⚠ — \/ Oracle \/ Page 1: Offhand ignored/)).toBeDefined();
  });

  it('collapses and expands a group', () => {
    const { store } = setup();
    const toggle = screen.getByRole('button', { name: /Base stats/ });

    fireEvent.click(toggle);

    expect(store.getState().ui.results.collapsedGroups).toEqual(['base']);
    expect(screen.queryByRole('rowheader', { name: 'STR' })).toBeNull();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');

    fireEvent.click(toggle);

    expect(screen.getByRole('rowheader', { name: 'STR' })).toBeDefined();
  });

  it('opens a swap from its column header', () => {
    const { firstSwapId, opened } = setup();

    fireEvent.click(screen.getByRole('button', { name: '— / Oracle / Page 1' }));

    expect(opened).toEqual([firstSwapId]);
  });

  it('hides swaps from the Swaps menu and offers to show them again when all are hidden', () => {
    const { store, actions, firstSwapId, secondSwapId } = setup();

    fireEvent.click(screen.getByRole('button', { name: /Swaps/ }));
    fireEvent.click(
      within(screen.getByRole('group', { name: 'Visible swaps' })).getByLabelText('Swap 2'),
    );

    expect(store.getState().ui.results.hiddenSwapIds).toEqual([secondSwapId]);
    expect(screen.queryByRole('button', { name: 'Swap 2' })).toBeNull();

    act(() => {
      actions.updateResultsView({ hiddenSwapIds: [firstSwapId, secondSwapId] });
    });

    expect(screen.getByText('All swaps hidden — show swaps')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Show all swaps' }));

    expect(store.getState().ui.results.hiddenSwapIds).toEqual([]);
    expect(screen.getByRole('button', { name: 'Swap 2' })).toBeDefined();
  });

  it('shows the empty state when no swap is included', () => {
    const { actions, firstSwapId, secondSwapId, opened } = setup();

    act(() => {
      for (const swapId of [firstSwapId, secondSwapId]) {
        actions.updateEntry('gearSwaps', swapId, (swap) => {
          swap.includeInResults = false;
        });
      }
    });

    expect(
      screen.getByText('Add a gear swap on the Buffs & Swaps tab to see results.'),
    ).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Go to Buffs & Swaps' }));

    expect(opened).toEqual([null]);
  });

  it('copies the table as TSV and reports success', async () => {
    const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
    installClipboard(writeText);
    const { store } = setup();

    fireEvent.click(screen.getByRole('button', { name: /Export/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy as TSV' }));

    await waitFor(() => {
      expect(store.getState().ui.toasts.map((toast) => toast.message)).toEqual(['Copied as TSV']);
    });

    const text = writeText.mock.calls[0]?.[0] ?? '';

    expect(text.startsWith('Group\tStat\t— / Oracle / Page 1\tSwap 2')).toBe(true);
    expect(text).toContain('Composition');
  });

  it('reports a clipboard failure as an error toast', async () => {
    installClipboard(() => Promise.reject(new Error('denied')));
    const { store } = setup();

    fireEvent.click(screen.getByRole('button', { name: /Export/ }));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Copy as Markdown' }));

    await waitFor(() => {
      const toast = store.getState().ui.toasts[0];

      expect(toast?.kind).toBe('error');
      expect(toast?.message).toBe('Could not copy as Markdown');
      expect(toast?.details).toEqual(['denied']);
    });
  });
});
