import type { KeyboardEvent, ReactNode } from 'react';

import { cx } from '@/lib/cx';

export type TileColumns = 3 | 4 | 6 | 9;

const COLUMN_CLASSES: Record<TileColumns, string> = {
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  6: 'grid-cols-6',
  9: 'grid-cols-9',
};

function moveFocus(event: KeyboardEvent<HTMLDivElement>): void {
  const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
  const backward = event.key === 'ArrowLeft' || event.key === 'ArrowUp';

  if (!forward && !backward) {
    return;
  }

  const tiles = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')].filter(
    (tile) => !tile.hasAttribute('disabled'),
  );
  const index = tiles.findIndex((tile) => tile === document.activeElement);

  if (index === -1) {
    return;
  }

  event.preventDefault();
  const next = tiles[(index + (forward ? 1 : tiles.length - 1)) % tiles.length];
  next?.focus();
}

/** Radio group of icon tiles (jobs, pet stats, achievements). */
export function TileGroup({
  label,
  columns,
  children,
  className,
}: {
  label: string;
  columns: TileColumns;
  children: ReactNode;
  className?: string | undefined;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={moveFocus}
      className={cx('grid gap-2', COLUMN_CLASSES[columns], className)}
    >
      {children}
    </div>
  );
}

export interface TileProps {
  selected: boolean;
  onSelect: () => void;
  icon?: ReactNode | undefined;
  label: ReactNode;
  title?: string | undefined;
  disabled?: boolean | undefined;
  /** `control` inside a sub-card, `sub` directly inside a card (plan D3). */
  surface?: 'control' | 'sub' | undefined;
  className?: string | undefined;
}

export function Tile({
  selected,
  onSelect,
  icon,
  label,
  title,
  disabled = false,
  surface = 'control',
  className,
}: TileProps) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      title={title}
      disabled={disabled}
      onClick={onSelect}
      className={cx(
        'flex flex-col items-center justify-center gap-1.5 rounded-[10px] px-1.5 py-2.5 text-[10.5px] text-muted transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        surface === 'control' ? 'bg-control hover:bg-control-hover' : 'bg-sub hover:bg-control',
        selected && 'bg-accent/12 font-semibold text-accent outline-2 outline-accent',
        className,
      )}
    >
      {icon}
      <span className="leading-tight">{label}</span>
    </button>
  );
}
