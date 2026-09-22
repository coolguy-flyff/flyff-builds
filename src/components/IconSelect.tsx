import { Listbox, ListboxButton, ListboxOption, ListboxOptions } from '@headlessui/react';
import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export interface IconSelectOption {
  readonly value: string;
  readonly label: string;
  /** Leading icon; options without one keep the label aligned with those that have one. */
  readonly icon?: ReactNode;
  /** Mono detail, e.g. the stat an entry grants: beside the label on the button, below it in the list. */
  readonly detail?: string | undefined;
}

export interface IconSelectProps {
  /** Accessible name of the control. */
  label: string;
  value: string;
  options: readonly IconSelectOption[];
  onChange: (value: string) => void;
  /** Width of the icon slot in px, so labels line up. */
  iconSize?: number | undefined;
  className?: string | undefined;
}

function IconSlot({ icon, size }: { icon: ReactNode; size: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {icon}
    </span>
  );
}

/**
 * A select whose options carry an icon and a detail — what a native `<select>` cannot show. The
 * button is one line and every option two, so neither changes height with the selection.
 * Keyboard and click-outside behaviour come from Headless UI's Listbox.
 */
export function IconSelect({
  label,
  value,
  options,
  onChange,
  iconSize = 22,
  className,
}: IconSelectProps) {
  const selected = options.find((option) => option.value === value) ?? options[0];

  return (
    <Listbox value={value} onChange={onChange}>
      <ListboxButton
        aria-label={label}
        className={cx(
          'flex h-8 w-full items-center gap-2 rounded-control bg-control px-2.5 text-[12px] text-text outline-none hover:bg-control-hover focus-visible:outline-2 focus-visible:outline-accent',
          className,
        )}
      >
        {selected !== undefined && (
          <>
            <IconSlot icon={selected.icon} size={iconSize} />
            <span className="min-w-0 flex-1 truncate text-left">
              {selected.label}
              {selected.detail !== undefined && (
                <span className="ml-2 font-mono text-[10.5px] text-muted">{selected.detail}</span>
              )}
            </span>
          </>
        )}
        <span aria-hidden="true" className="shrink-0 text-[9px] text-dim">
          ▾
        </span>
      </ListboxButton>
      <ListboxOptions
        anchor="bottom start"
        transition
        className="z-50 w-[var(--button-width)] rounded-sub bg-sub p-1.5 shadow-panel outline-1 outline-white/6 [--anchor-gap:4px] [--anchor-max-height:20rem] data-[closed]:opacity-0"
      >
        {options.map((option) => (
          <ListboxOption
            key={option.value}
            value={option.value}
            className="flex h-10 cursor-pointer items-center gap-2 rounded-[7px] px-2 text-[12px] text-text select-none data-[focus]:bg-control data-[selected]:text-accent"
          >
            <IconSlot icon={option.icon} size={iconSize} />
            <span className="min-w-0 flex-1">
              <span className="block truncate">{option.label}</span>
              {option.detail !== undefined && (
                <span className="block truncate font-mono text-[10px] text-muted">
                  {option.detail}
                </span>
              )}
            </span>
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  );
}
