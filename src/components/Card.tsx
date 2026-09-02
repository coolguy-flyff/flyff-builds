import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';

import { cx } from '@/lib/cx';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  selected?: boolean | undefined;
  padding?: 'list' | 'editor' | undefined;
}

/** Top-level surface (plan D1): flat fill, radius 14, no border. Forwards its ref (drag & drop). */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { selected = false, padding = 'list', className, ...rest },
  ref,
) {
  return (
    <section
      ref={ref}
      data-selected={selected ? 'true' : undefined}
      className={cx(
        'rounded-card bg-card',
        padding === 'list' ? 'px-[18px] py-4' : 'px-5 py-[18px]',
        selected && 'outline-2 outline-accent/35',
        className,
      )}
      {...rest}
    />
  );
});

export function CardTitle({
  children,
  right,
  className,
}: {
  children: ReactNode;
  right?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cx('mb-3 flex items-center gap-2', className)}>
      <h2 className="text-[13px] font-semibold text-text">{children}</h2>
      {right !== undefined && <div className="ml-auto flex items-center gap-1.5">{right}</div>}
    </div>
  );
}

export type StatusTone = 'ok' | 'warn' | 'danger' | 'muted';

const STATUS_TONE: Record<StatusTone, string> = {
  ok: 'text-ok',
  warn: 'text-warn',
  danger: 'text-danger',
  muted: 'text-muted',
};

export interface SubCardProps {
  label: ReactNode;
  /** Dim inline note after the label, e.g. "one slider per ranged ability". */
  note?: ReactNode | undefined;
  /** Right-aligned mono status such as "10 / 10 used". */
  status?: ReactNode | undefined;
  statusTone?: StatusTone | undefined;
  /** Spans both columns of an editor grid. */
  span?: boolean | undefined;
  className?: string | undefined;
  children: ReactNode;
}

/** Field group inside a card (plan D3): uppercase label + content. */
export function SubCard({
  label,
  note,
  status,
  statusTone = 'muted',
  span = false,
  className,
  children,
}: SubCardProps) {
  return (
    <div className={cx('rounded-sub bg-sub px-3.5 py-3', span && 'md:col-span-2', className)}>
      <div className="mb-2 flex items-baseline gap-2">
        <span className="text-[11px] font-semibold tracking-[0.06em] text-muted uppercase">
          {label}
        </span>
        {note !== undefined && <span className="text-[10.5px] text-dim">{note}</span>}
        {status !== undefined && (
          <span className={cx('ml-auto font-mono text-[11px]', STATUS_TONE[statusTone])}>
            {status}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}
