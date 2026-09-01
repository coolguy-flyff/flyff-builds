import { Menu, MenuButton, MenuItem, MenuItems } from '@headlessui/react';
import { Fragment, type ReactNode } from 'react';

import { Button, type ButtonSize, type ButtonVariant } from '@/components/Button';
import { cx } from '@/lib/cx';

export interface DropdownMenuItem {
  key: string;
  label: ReactNode;
  onSelect: () => void;
  danger?: boolean | undefined;
  disabled?: boolean | undefined;
}

export type DropdownMenuAnchor = 'bottom end' | 'bottom start' | 'top end' | 'top start';

export interface DropdownMenuProps {
  /** Accessible name of the trigger, e.g. "More actions for Etranar". */
  label: string;
  items: readonly DropdownMenuItem[];
  /** Trigger content (e.g. an ellipsis); defaults to the label plus a caret. */
  children?: ReactNode | undefined;
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  anchor?: DropdownMenuAnchor | undefined;
  className?: string | undefined;
}

/** Action menu on a trigger button (plan D7 menu-panel style); keyboard and click-outside handled by Headless UI. */
export function DropdownMenu({
  label,
  items,
  children,
  variant = 'neutral',
  size = 'md',
  anchor = 'bottom end',
  className,
}: DropdownMenuProps) {
  return (
    <Menu>
      <MenuButton as={Fragment}>
        <Button
          aria-label={label}
          title={children === undefined ? undefined : label}
          variant={variant}
          size={size}
          className={className}
        >
          {children ?? <>{label} &#9662;</>}
        </Button>
      </MenuButton>
      <MenuItems
        anchor={anchor}
        transition
        className="z-50 min-w-44 rounded-sub bg-sub p-1.5 shadow-panel transition [--anchor-gap:4px] data-[closed]:opacity-0"
      >
        {items.map((item) => (
          <MenuItem key={item.key} disabled={item.disabled === true}>
            <button
              type="button"
              onClick={() => {
                item.onSelect();
              }}
              className={cx(
                'block w-full rounded-[7px] px-2.5 py-1.5 text-left text-[12px] data-[disabled]:opacity-50 data-[focus]:bg-control',
                item.danger === true ? 'text-danger' : 'text-text',
              )}
            >
              {item.label}
            </button>
          </MenuItem>
        ))}
      </MenuItems>
    </Menu>
  );
}
