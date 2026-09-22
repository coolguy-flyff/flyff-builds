import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Fragment, type ReactNode } from 'react';

import { cx } from '@/lib/cx';

import { Button, type ButtonVariant } from './Button';
import { SparkleLayer } from './Sparkles';

export interface ToolbarMenuProps {
  /** Button text; a count badge (when positive) and a caret follow it. */
  label: string;
  /** How many settings inside are switched on; hidden at 0. */
  count?: number | undefined;
  tone?: ToolbarMenuTone | undefined;
  anchor?: 'bottom start' | 'bottom end' | undefined;
  /** Panel width and layout classes, e.g. `w-[480px]`. */
  panelClassName?: string | undefined;
  children: ReactNode;
}

/**
 * `active`: tinted while something inside changes the numbers, so an override stays visible.
 * `golden`: gold and glittering, for pet grace.
 */
export type ToolbarMenuTone = 'plain' | 'active' | 'golden';

const TONE_STYLES: Record<ToolbarMenuTone, { variant: ButtonVariant; caret: string }> = {
  plain: { variant: 'neutral', caret: 'text-dim' },
  active: { variant: 'soft', caret: '' },
  golden: { variant: 'golden', caret: 'text-sparkle/70' },
};

/** A toolbar button opening a panel of settings (switches, selects), closed by click-outside/Escape. */
export function ToolbarMenu({
  label,
  count = 0,
  tone = 'plain',
  anchor = 'bottom start',
  panelClassName,
  children,
}: ToolbarMenuProps) {
  const toneStyle = TONE_STYLES[tone];

  return (
    <Popover>
      <PopoverButton as={Fragment}>
        <Button variant={toneStyle.variant} aria-label={label} className="relative">
          {tone === 'golden' && <SparkleLayer />}
          {label}
          {count > 0 && (
            <span
              aria-hidden="true"
              className="rounded-full bg-accent px-1.5 font-mono text-[9.5px] leading-[15px] font-semibold text-on-accent"
            >
              {count}
            </span>
          )}
          <span aria-hidden="true" className={cx('text-[9px]', toneStyle.caret)}>
            ▾
          </span>
        </Button>
      </PopoverButton>
      <PopoverPanel
        anchor={anchor}
        aria-label={label}
        className={cx(
          'z-50 flex flex-col gap-3 rounded-card bg-sub p-3.5 shadow-panel outline-1 outline-white/6 [--anchor-gap:6px]',
          panelClassName,
        )}
      >
        {children}
      </PopoverPanel>
    </Popover>
  );
}

/** A titled block inside a {@link ToolbarMenu}: uppercase title, optional note on the right. */
export function ToolbarMenuSection({
  title,
  note,
  children,
}: {
  title: string;
  note?: ReactNode | undefined;
  children: ReactNode;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[9.5px] font-semibold tracking-[0.08em] text-dim uppercase">
          {title}
        </span>
        {note !== undefined && <span className="text-[10px] text-dim">{note}</span>}
      </div>
      {children}
    </section>
  );
}
