// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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
