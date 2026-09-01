// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { requireDefined } from '@/lib/assert';
import { createDefaultBuild } from '@/domain/build';
import { DialogHost } from '@/features/dialogs/DialogHost';
import { createMemoryStorage } from '@/persistence';
import { createAppStore, StoreProvider, type AppStoreApi } from '@/state';

import { SnapshotsMenu } from './SnapshotsMenu';

const data = loadBundledGameData();

function mount(): AppStoreApi {
  let now = 1_000;
  const store = createAppStore(
    { data, storage: createMemoryStorage(), now: () => (now += 1) },
    createDefaultBuild(data),
  );

  render(
    <StoreProvider store={store} data={data}>
      <SnapshotsMenu />
      <DialogHost />
    </StoreProvider>,
  );

  return store;
}

/** A named snapshot at level 170 plus a newer automatic one, with the working build back at 190. */
function seedSnapshots(store: AppStoreApi): void {
  const { actions } = store.getState();

  act(() => {
    actions.setLevel(170);
    actions.saveSnapshot('Before');
    actions.autoSnapshot('Autosave before test');
    actions.setLevel(190);
  });
}

async function openMenu(): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'Snapshots ▾' }));
  await screen.findByText('Loading keeps your current build as an automatic snapshot.');
}

async function chooseRowAction(action: string): Promise<void> {
  fireEvent.click(screen.getByRole('button', { name: 'More actions for Before' }));
  fireEvent.click(await screen.findByRole('menuitem', { name: action }));
}

function snapshotNames(store: AppStoreApi): string[] {
  return store.getState().ui.snapshots.map((snapshot) => snapshot.name);
}

afterEach(cleanup);

describe('SnapshotsMenu', () => {
  it('lists snapshots newest first with job, level, swaps and the automatic marker', async () => {
    const store = mount();

    seedSnapshots(store);
    await openMenu();

    const rows = screen.getAllByRole('listitem');

    expect(rows.length).toBe(2);
    expect(rows[0]?.textContent).toContain('Autosave before test ');
    expect(rows[0]?.textContent).toContain(' · automatic');
    expect(rows[1]?.textContent).toContain('Before');
    expect(rows[1]?.textContent).toMatch(/Seraph · Lv 170 · 1 swap · /);
    expect(rows[1]?.textContent).not.toContain('automatic');
  });

  it('shows the empty state without snapshots', async () => {
    mount();
    await openMenu();

    expect(
      screen.getByText('No snapshots yet. Use Save as… to keep a copy of the current build.'),
    ).toBeDefined();
  });

  it('Load asks for confirmation, then replaces the working build', async () => {
    const store = mount();

    seedSnapshots(store);
    await openMenu();
    fireEvent.click(
      requireDefined(
        screen.getAllByRole('button', { name: 'Load' })[1],
        "the 'Before' row's Load button",
      ),
    );

    await screen.findByText(/Replace your current working build with 'Before'\?/);
    fireEvent.click(screen.getByRole('button', { name: 'Load snapshot' }));

    const { build, ui } = store.getState();

    expect(build.character.level).toBe(170);
    expect(ui.toasts.map((toast) => toast.message)).toEqual(["Loaded snapshot 'Before'"]);
    expect(ui.snapshots.length).toBe(3);
  });

  it('renames inline with Enter and cancels with Escape', async () => {
    const store = mount();

    seedSnapshots(store);
    await openMenu();
    await chooseRowAction('Rename');

    const input = screen.getByLabelText('Snapshot name');

    expect(input).toHaveProperty('value', 'Before');
    fireEvent.change(input, { target: { value: 'After' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(snapshotNames(store)).toEqual([
      expect.stringMatching(/^Autosave before test /),
      'After',
    ]);

    fireEvent.click(screen.getByRole('button', { name: 'More actions for After' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    fireEvent.change(screen.getByLabelText('Snapshot name'), { target: { value: 'Nope' } });
    fireEvent.keyDown(screen.getByLabelText('Snapshot name'), { key: 'Escape' });

    expect(screen.queryByLabelText('Snapshot name')).toBeNull();
    expect(snapshotNames(store)[1]).toBe('After');
    expect(screen.getByRole('list', { name: 'Snapshots' })).toBeDefined();
  });

  it('Overwrite with current stores the working build after confirming', async () => {
    const store = mount();

    seedSnapshots(store);
    await openMenu();
    await chooseRowAction('Overwrite with current');

    await screen.findByText(/Replace the contents of 'Before'/);
    fireEvent.click(screen.getByRole('button', { name: 'Overwrite' }));

    const { ui } = store.getState();

    expect(ui.snapshots.find((snapshot) => snapshot.name === 'Before')?.level).toBe(190);
    expect(ui.toasts.map((toast) => toast.message)).toEqual([
      "Snapshot 'Before' now holds the current build",
    ]);
  });

  it('Delete removes the snapshot after confirming', async () => {
    const store = mount();

    seedSnapshots(store);
    await openMenu();
    await chooseRowAction('Delete');

    await screen.findByText(/Delete 'Before'\?/);
    fireEvent.click(screen.getByRole('button', { name: 'Delete snapshot' }));

    expect(snapshotNames(store)).toEqual([expect.stringMatching(/^Autosave before test /)]);
  });
});
