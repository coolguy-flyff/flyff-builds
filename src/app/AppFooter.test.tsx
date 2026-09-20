// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { createMemoryStorage } from '@/persistence';
import { createAppStore, StoreProvider } from '@/state';

import { AppFooter } from './AppFooter';

const data = loadBundledGameData();
const GITHUB_URL = 'https://github.com/coolguy-flyff/flyff-builds';

function mount(): void {
  const store = createAppStore(
    { data, storage: createMemoryStorage(), now: () => 1 },
    createDefaultBuild(data),
  );

  render(
    <StoreProvider store={store} data={data}>
      <AppFooter />
    </StoreProvider>,
  );
}

afterEach(cleanup);

describe('AppFooter', () => {
  it('renders one line with the author, data version and the legal disclaimer button', () => {
    mount();

    expect(screen.getByRole('contentinfo').textContent).toBe(
      `Made by coolguy (Discord: c.o.o.l.g.u.y) · Data version: ${data.manifest.dataVersion} · Fan community project · Legal disclaimer`,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens the legal disclaimer with the attributions and closes it again', async () => {
    mount();

    fireEvent.click(screen.getByRole('button', { name: 'Legal disclaimer' }));

    const dialog = await screen.findByRole('dialog');

    expect(screen.getByRole('link', { name: 'source code' }).getAttribute('href')).toBe(GITHUB_URL);
    expect(screen.getByRole('link', { name: 'full license text' }).getAttribute('href')).toBe(
      `${GITHUB_URL}/blob/main/LICENSE`,
    );
    expect(screen.getByRole('link', { name: 'Flyffulator' }).getAttribute('href')).toBe(
      'https://github.com/Frostiae/Flyffulator',
    );
    expect(screen.getByRole('link', { name: 'universe.flyff.com' })).toBeDefined();
    expect(dialog.textContent).toContain('not affiliated with, endorsed by');
    expect(dialog.textContent).toContain(`currently data version ${data.manifest.dataVersion}`);
    expect(dialog.textContent).toContain('GPL-3.0');

    // The ✕ icon is also labelled "Close"; the text match picks the footer action only.
    fireEvent.click(screen.getByText('Close', { selector: 'button' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
