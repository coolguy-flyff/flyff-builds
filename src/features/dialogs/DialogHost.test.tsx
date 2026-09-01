// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild, type BuildState } from '@/domain/build';
import { createMemoryStorage } from '@/persistence';
import { buildShareUrl, encodeShareCode } from '@/share';
import { typicalBuild } from '@/share/testing/fixtures';
import {
  createAppStore,
  StoreProvider,
  type AppActions,
  type AppStoreApi,
  type DialogState,
} from '@/state';

import { DialogHost } from './DialogHost';

const data = loadBundledGameData();
const IMPORT_BUTTON = 'Import — replaces working build';

function mount(build: BuildState = createDefaultBuild(data)): AppStoreApi {
  const store = createAppStore({ data, storage: createMemoryStorage(), now: () => 1 }, build);

  render(
    <StoreProvider store={store} data={data}>
      <DialogHost />
    </StoreProvider>,
  );

  return store;
}

/** Store updates outside React events must be wrapped in `act` to flush the re-render. */
function run(store: AppStoreApi, change: (actions: AppActions) => void): void {
  act(() => {
    change(store.getState().actions);
  });
}

function openDialog(store: AppStoreApi, dialog: NonNullable<DialogState>): void {
  run(store, (actions) => {
    actions.openDialog(dialog);
  });
}

/** jsdom has no clipboard; installs a fake `navigator.clipboard` for one test. */
function stubClipboard(writeText: (text: string) => Promise<void>): void {
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
}

function toastMessages(store: AppStoreApi): string[] {
  return store.getState().ui.toasts.map((toast) => `${toast.kind}: ${toast.message}`);
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(navigator, 'clipboard');
});

describe('Share', () => {
  it('renders the code and a ?b= link ending in #/results', async () => {
    const build = typicalBuild(data);
    const store = mount(build);
    const expected = await encodeShareCode(data, build);

    openDialog(store, { kind: 'share' });

    await waitFor(() => {
      expect(screen.getByLabelText('Code').textContent).toBe(expected);
    });
    expect(screen.getByLabelText('Link').textContent).toBe(
      `${window.location.origin}/?b=${expected}#/results`,
    );
    expect(screen.getByText('Paste this code in Import on any device.')).toBeDefined();
  });

  it('copies the link and confirms for a moment', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stubClipboard(writeText);
    const store = mount();

    openDialog(store, { kind: 'share' });
    await screen.findByText(/\?b=/);
    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }));

    await screen.findByText('Copied ✓');
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('?b='));
  });

  it('toasts and selects the text when the clipboard is unavailable', async () => {
    const store = mount();

    openDialog(store, { kind: 'share' });
    await screen.findByText(/\?b=/);
    fireEvent.click(screen.getByRole('button', { name: 'Copy code' }));

    await waitFor(() => {
      expect(toastMessages(store)).toEqual([
        expect.stringMatching(/^error: Could not copy the code/),
      ]);
    });
    expect(window.getSelection()?.toString()).toBe(screen.getByLabelText('Code').textContent);
  });
});

describe('Import', () => {
  it('previews a valid code and replaces the working build on import', async () => {
    const store = mount();
    const code = await encodeShareCode(data, typicalBuild(data));

    openDialog(store, { kind: 'import', initialText: '' });
    expect(screen.getByRole('button', { name: IMPORT_BUTTON })).toHaveProperty('disabled', true);

    fireEvent.change(screen.getByLabelText('Link or code'), { target: { value: code } });

    await screen.findByText('✓ Valid code');
    expect(screen.getByText('Seraph · Lv 190')).toBeDefined();
    expect(
      screen.getByText(
        '1 stat page · 1 set · 2 weapons · 1 shield · 1 accessory set · 1 fashion set · 1 pet · 2 swaps',
      ),
    ).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: IMPORT_BUTTON }));

    const { build, ui } = store.getState();

    expect(build.weapons.length).toBe(2);
    expect(build.gearSwaps.length).toBe(2);
    expect(ui.dialog).toBeNull();
    expect(toastMessages(store)).toEqual(['success: Build imported']);
    expect(ui.snapshots.map((snapshot) => snapshot.automatic)).toEqual([true]);
    expect(ui.snapshots[0]?.name).toMatch(/^Autosave before import /);
  });

  it('shows the error row for text that is not a code', async () => {
    const store = mount();

    openDialog(store, { kind: 'import', initialText: '' });
    fireEvent.change(screen.getByLabelText('Link or code'), {
      target: { value: 'not a code!!!' },
    });

    await screen.findByText('✕ Not a valid Flyff Builds code');
    expect(screen.getByRole('button', { name: IMPORT_BUTTON })).toHaveProperty('disabled', true);
  });

  it('previews a share link it was opened with (the ?b= boot flow)', async () => {
    const store = mount();
    const code = await encodeShareCode(data, typicalBuild(data));

    openDialog(store, { kind: 'import', initialText: buildShareUrl('http://localhost/', code) });

    await screen.findByText('✓ Valid code');
    expect(screen.getByLabelText('Link or code')).toHaveProperty(
      'value',
      `http://localhost/?b=${code}#/results`,
    );
  });
});

describe('Save as…', () => {
  it('saves a named snapshot and closes', () => {
    const store = mount();

    openDialog(store, { kind: 'saveAs' });

    const input = screen.getByLabelText('Snapshot name');

    expect(input).toHaveProperty('value', expect.stringMatching(/^Seraph 190 — /));

    fireEvent.change(input, { target: { value: '  My build  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    const { ui } = store.getState();

    expect(ui.snapshots.map((snapshot) => snapshot.name)).toEqual(['My build']);
    expect(ui.dialog).toBeNull();
    expect(toastMessages(store)).toEqual(["success: Saved snapshot 'My build'"]);
  });

  it('falls back to the default name when the field is blank', () => {
    const store = mount();

    openDialog(store, { kind: 'saveAs' });
    fireEvent.change(screen.getByLabelText('Snapshot name'), { target: { value: '   ' } });
    fireEvent.submit(screen.getByRole('button', { name: 'Save' }));

    expect(store.getState().ui.snapshots[0]?.name).toMatch(/^Seraph 190 — /);
  });
});

describe('Snapshots dialog', () => {
  it('lists snapshots and loads one after confirming', async () => {
    const store = mount();

    run(store, (actions) => {
      actions.setLevel(170);
      actions.saveSnapshot('Before');
      actions.setLevel(190);
    });
    openDialog(store, { kind: 'snapshots' });

    expect(screen.getByText('Before')).toBeDefined();
    expect(screen.getByText(/^Seraph · Lv 170 · 1 swap · /)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Load' }));

    await screen.findByText(/Replace your current working build with 'Before'\?/);
    fireEvent.click(screen.getByRole('button', { name: 'Load snapshot' }));

    const { build, ui } = store.getState();

    expect(build.character.level).toBe(170);
    expect(ui.dialog).toBeNull();
    expect(toastMessages(store)).toEqual(["success: Loaded snapshot 'Before'"]);
    expect(ui.snapshots.length).toBe(2);
    expect(ui.snapshots.filter((snapshot) => snapshot.automatic).length).toBe(1);
  });

  it('shows the empty state', () => {
    const store = mount();

    openDialog(store, { kind: 'snapshots' });

    expect(
      screen.getByText('No snapshots yet. Use Save as… to keep a copy of the current build.'),
    ).toBeDefined();
  });
});
