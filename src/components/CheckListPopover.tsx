import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Fragment, type ReactNode } from 'react';

import { cx } from '@/lib/cx';

import { Button, type ButtonSize, type ButtonVariant } from './Button';

export interface CheckListItem {
  readonly key: string;
  readonly label: string;
  readonly checked: boolean;
}

export interface CheckListPopoverProps {
  /** Button text; a caret is appended. */
  label: ReactNode;
  /** Accessible name of the checkbox group. */
  title: string;
  items: readonly CheckListItem[];
  onToggle: (key: string, checked: boolean) => void;
  emptyHint?: string | undefined;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  align?: 'start' | 'end' | undefined;
  className?: string | undefined;
}

/** Button opening a multi-select list of checkboxes (column pickers, NPC groups, …). */
export function CheckListPopover({
  label,
  title,
  items,
  onToggle,
  emptyHint,
  variant = 'neutral',
  size = 'md',
  align = 'end',
  className,
}: CheckListPopoverProps) {
  return (
    <Popover as="div" className={cx('relative inline-block', className)}>
      <PopoverButton as={Fragment}>
        <Button variant={variant} size={size}>
          {label} ▾
        </Button>
      </PopoverButton>
      <PopoverPanel
        className={cx(
          'absolute z-30 mt-1 min-w-[220px] rounded-sub bg-card p-1.5 shadow-panel outline-none',
          align === 'end' ? 'right-0' : 'left-0',
        )}
      >
        <div role="group" aria-label={title} className="flex max-h-72 flex-col overflow-auto">
          {items.length === 0 && emptyHint !== undefined && (
            <p className="px-2.5 py-1.5 text-[11px] text-dim">{emptyHint}</p>
          )}
          {items.map((item) => (
            <label
              key={item.key}
              className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-[12px] text-text hover:bg-white/5"
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(event) => {
                  onToggle(item.key, event.currentTarget.checked);
                }}
                className="accent-accent"
              />
              <span className="min-w-0 truncate">{item.label}</span>
            </label>
          ))}
        </div>
      </PopoverPanel>
    </Popover>
  );
}
