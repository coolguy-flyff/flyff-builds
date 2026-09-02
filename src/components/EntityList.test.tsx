// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EntityList } from './EntityList';
import { reorderByKeyboard, stubSiblingLayout } from './testing/sortable';

const ITEMS = [
  { id: 1, name: 'Oracle +10', chips: [{ label: '+10' }], status: 'ok' as const },
  { id: 2, name: 'Maw of Judgement +8', status: 'warning' as const },
];

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('EntityList', () => {
  it('selects with clicks and arrow keys, activates with Enter', () => {
    const onSelect = vi.fn();
    const onActivate = vi.fn();

    render(
      <EntityList
        label="Weapons"
        items={ITEMS}
        selectedId={1}
        onSelect={onSelect}
        onActivate={onActivate}
        onMove={() => undefined}
        addLabel="+ Add weapon"
        onAdd={() => undefined}
      />,
    );

    fireEvent.click(screen.getByText('Maw of Judgement +8'));
    expect(onSelect).toHaveBeenLastCalledWith(2);

    const list = screen.getByRole('listbox', { name: 'Weapons' });

    fireEvent.keyDown(list, { key: 'ArrowDown' });
    expect(onSelect).toHaveBeenLastCalledWith(2);

    fireEvent.keyDown(list, { key: 'Enter' });
    expect(onActivate).toHaveBeenCalledWith(1);
  });

  it('renders chips, status dots and the add card', () => {
    const onAdd = vi.fn();

    render(
      <EntityList
        label="Weapons"
        items={ITEMS}
        selectedId={null}
        onSelect={() => undefined}
        onMove={() => undefined}
        addLabel="+ Add weapon"
        onAdd={onAdd}
      />,
    );

    expect(screen.getByText('+10')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Has warnings' })).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '+ Add weapon' }));

    expect(onAdd).toHaveBeenCalledOnce();
  });

  it('reorders rows by dragging their grips (keyboard: Space, arrow, Space)', async () => {
    const onMove = vi.fn();

    stubSiblingLayout('vertical');
    render(
      <EntityList
        label="Weapons"
        items={ITEMS}
        selectedId={null}
        onSelect={() => undefined}
        onMove={onMove}
        addLabel="+ Add weapon"
        onAdd={() => undefined}
      />,
    );

    await reorderByKeyboard(screen.getByLabelText('Drag to reorder Oracle +10'), 'ArrowDown');

    expect(onMove).toHaveBeenCalledWith(1, 2);
  });
});
