import { act, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';

import type { SortableDirection } from '../Sortable';

const CELL_SIZE_PX = 100;

type ArrowKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

function rectAt(x: number, y: number): DOMRect {
  return {
    x,
    y,
    width: CELL_SIZE_PX,
    height: CELL_SIZE_PX,
    top: y,
    left: x,
    right: x + CELL_SIZE_PX,
    bottom: y + CELL_SIZE_PX,
    toJSON: () => ({}),
  };
}

/**
 * jsdom performs no layout, so every rect is empty and dnd-kit cannot tell neighbours apart. Lay
 * siblings out on a line instead: the `i`th child of any parent occupies `[i * 100, (i + 1) * 100)`
 * along the list axis. Restore with `vi.restoreAllMocks()`.
 */
export function stubSiblingLayout(direction: SortableDirection): void {
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (
    this: HTMLElement,
  ) {
    const siblings = this.parentElement === null ? [this] : Array.from(this.parentElement.children);
    const offset = siblings.indexOf(this) * CELL_SIZE_PX;

    return direction === 'horizontal' ? rectAt(offset, 0) : rectAt(0, offset);
  });

  // dnd-kit scrolls the picked-up item into view; jsdom has no scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
}

/** Picks `handle` up with the keyboard, moves it one item in `key`'s direction and drops it. */
export async function reorderByKeyboard(handle: HTMLElement, key: ArrowKey): Promise<void> {
  fireEvent.keyDown(handle, { code: 'Space' });

  // The keyboard sensor attaches its move/drop listeners on the next macrotask.
  await act(
    () =>
      new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      }),
  );

  fireEvent.keyDown(handle, { code: key });
  fireEvent.keyDown(handle, { code: 'Space' });
}
