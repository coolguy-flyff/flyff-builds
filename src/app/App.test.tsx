// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { createMemoryStorage, STORAGE_KEYS } from '@/persistence';

import { App } from './App';
import { bootstrapApp } from './bootstrap';

function mount(hash = '#/character') {
  window.location.hash = hash;
  const storage = createMemoryStorage();
  const booted = bootstrapApp({
    storage,
    now: () => 1,
    href: `http://localhost/${hash}`,
    replaceUrl: () => undefined,
  });

  render(<App store={booted.store} data={booted.data} />);

  return { ...booted, storage };
}

afterEach(cleanup);

describe('App', () => {
  it('renders the shell with the default Seraph build on the character tab', () => {
    mount();

    expect(screen.getAllByText('Seraph').length).toBeGreaterThan(0);
    expect(screen.getByRole('tab', { name: /Character/ }).getAttribute('aria-selected')).toBe(
      'true',
    );
    expect(screen.getByLabelText('Character level')).toHaveProperty('value', '190');
  });

  it('level changes flow through the store and autosave', () => {
    const { store, storage } = mount();

    fireEvent.click(screen.getByLabelText('Decrease Character level'));

    expect(store.getState().build.character.level).toBe(189);
    expect(storage.get(STORAGE_KEYS.current)).toContain('"level":189');
  });

  it('switches tabs through the hash router', () => {
    mount();

    fireEvent.click(screen.getByRole('tab', { name: /Results/ }));

    expect(window.location.hash).toBe('#/results');
  });
});

describe('Reset', () => {
  /** Changes the level so a reset has something to undo, then opens the header's Start over dialog. */
  function openResetDialog(): void {
    fireEvent.click(screen.getByLabelText('Decrease Character level'));
    fireEvent.click(within(screen.getByRole('banner')).getByRole('button', { name: 'Reset' }));
  }

  const snapshotCheckbox = (): HTMLInputElement =>
    screen.getByRole('checkbox', { name: 'Keep the current build as a snapshot' });

  it('offers cancel and start over, with the snapshot checked by default', () => {
    const { store } = mount();

    openResetDialog();

    expect(screen.getByText('Start over?')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Start over' })).toBeDefined();
    expect(snapshotCheckbox().checked).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(store.getState().build.character.level).toBe(189);
    expect(store.getState().ui.dialog).toBeNull();
  });

  it('keeps the previous build as an automatic snapshot while the box is checked', () => {
    const { store } = mount();

    openResetDialog();
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));

    const { build, ui } = store.getState();

    expect(build.character.level).toBe(190);
    expect(ui.dialog).toBeNull();
    expect(ui.snapshots.map((snapshot) => snapshot.automatic)).toEqual([true]);
    expect(ui.toasts.map((toast) => toast.message)).toEqual([
      'Build reset — the previous build was kept as a snapshot.',
    ]);
  });

  it('names the kept snapshot after the optional name field', () => {
    const { store } = mount();

    openResetDialog();

    const name = screen.getByLabelText('Snapshot name');

    expect(name.getAttribute('placeholder')).toMatch(/^Autosave before reset /);
    fireEvent.change(name, { target: { value: 'Before the respec' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));

    expect(
      store.getState().ui.snapshots.map((snapshot) => [snapshot.name, snapshot.automatic]),
    ).toEqual([['Before the respec', false]]);
  });

  it('disables the name field while the box is unchecked', () => {
    mount();

    openResetDialog();
    fireEvent.click(snapshotCheckbox());

    expect(screen.getByLabelText('Snapshot name')).toHaveProperty('disabled', true);
  });

  it('leaves no snapshot behind once the box is unchecked', () => {
    const { store } = mount();

    openResetDialog();
    fireEvent.click(snapshotCheckbox());
    fireEvent.click(screen.getByRole('button', { name: 'Start over' }));

    const { build, ui } = store.getState();

    expect(build.character.level).toBe(190);
    expect(ui.dialog).toBeNull();
    expect(ui.snapshots).toEqual([]);
    expect(ui.toasts.map((toast) => toast.message)).toEqual(['Build reset.']);
  });
});
