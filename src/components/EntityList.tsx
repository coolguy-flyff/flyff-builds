import type { KeyboardEvent, ReactNode } from 'react';

import { cx } from '@/lib/cx';

import { Chip, StatusDot, type ChipTone, type StatusDotTone } from './Chip';
import { DashedAddCard } from './DashedAddCard';

export interface EntityListChip {
  label: string;
  tone?: ChipTone | undefined;
}

export interface EntityListItem {
  id: number;
  name: string;
  /** Colour class for the name (rarity). */
  nameClassName?: string | undefined;
  icon?: ReactNode | undefined;
  usage?: string | undefined;
  usageTitle?: string | undefined;
  status?: StatusDotTone | null | undefined;
  statusTitle?: string | undefined;
  chips?: readonly EntityListChip[] | undefined;
}

export interface EntityListProps {
  label: string;
  items: readonly EntityListItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  /** Enter on the selected row (focus the editor). */
  onActivate?: ((id: number) => void) | undefined;
  addLabel: string;
  onAdd: () => void;
  addDisabled?: boolean | undefined;
  addTitle?: string | undefined;
  emptyHint?: string | undefined;
  className?: string | undefined;
}

/** Master list of gear entries (plan D3): rows with name, usage, status dot and summary chips. */
export function EntityList({
  label,
  items,
  selectedId,
  onSelect,
  onActivate,
  addLabel,
  onAdd,
  addDisabled = false,
  addTitle,
  emptyHint,
  className,
}: EntityListProps) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = items.findIndex((item) => item.id === selectedId);

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next = items[Math.min(Math.max(index + delta, 0), items.length - 1)];

      if (next !== undefined) {
        onSelect(next.id);
      }
    } else if (event.key === 'Enter' && selectedId !== null) {
      event.preventDefault();
      onActivate?.(selectedId);
    }
  };

  return (
    <div className={cx('flex flex-col gap-2', className)}>
      <div
        role="listbox"
        aria-label={label}
        tabIndex={0}
        onKeyDown={onKeyDown}
        aria-activedescendant={selectedId === null ? undefined : `entity-${label}-${selectedId}`}
        className="flex flex-col gap-2 outline-none focus-visible:outline-2 focus-visible:outline-accent/50"
      >
        {items.map((item) => {
          const selected = item.id === selectedId;

          return (
            <div
              key={item.id}
              id={`entity-${label}-${item.id}`}
              role="option"
              aria-selected={selected}
              onClick={() => {
                onSelect(item.id);
              }}
              onDoubleClick={() => {
                onActivate?.(item.id);
              }}
              className={cx(
                'cursor-pointer rounded-row bg-row px-3.5 py-[13px] transition-colors hover:bg-sub',
                selected && 'outline-2 outline-accent',
              )}
            >
              <div className="flex items-center gap-2.5">
                {item.icon}
                <span
                  className={cx(
                    'min-w-0 flex-1 truncate text-[13px] font-semibold',
                    item.nameClassName,
                  )}
                >
                  {item.name}
                </span>
                {item.usage !== undefined && (
                  <span className="shrink-0 text-[11px] text-muted" title={item.usageTitle}>
                    {item.usage}
                  </span>
                )}
                {item.status !== undefined && item.status !== null && (
                  <StatusDot tone={item.status} title={item.statusTitle} />
                )}
              </div>
              {item.chips !== undefined && item.chips.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {item.chips.map((chip) => (
                    <Chip key={chip.label} tone={chip.tone}>
                      {chip.label}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {items.length === 0 && emptyHint !== undefined && (
        <p className="px-1 text-[11px] text-dim">{emptyHint}</p>
      )}
      <DashedAddCard label={addLabel} onClick={onAdd} disabled={addDisabled} title={addTitle} />
    </div>
  );
}
