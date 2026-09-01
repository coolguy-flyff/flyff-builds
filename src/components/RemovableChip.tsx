import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

/** Neutral chip with a trailing remove button (ad-hoc picks, active filters). */
export function RemovableChip({
  children,
  onRemove,
  removeLabel,
  title,
  className,
}: {
  children: ReactNode;
  onRemove: () => void;
  /** Accessible name of the remove button, e.g. "Remove Grilled Eel". */
  removeLabel: string;
  title?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center gap-1 rounded-chip bg-white/7 py-0.5 pr-1 pl-1.5 font-mono text-[10.5px] font-medium whitespace-nowrap text-text-2',
        className,
      )}
    >
      {children}
      <button
        type="button"
        aria-label={removeLabel}
        title={removeLabel}
        onClick={onRemove}
        className="rounded-[3px] px-0.5 leading-none text-dim hover:bg-white/10 hover:text-text"
      >
        ✕
      </button>
    </span>
  );
}
