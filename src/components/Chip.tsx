import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export type ChipTone = 'neutral' | 'accent' | 'warn' | 'danger' | 'ok';

const CHIP_TONE: Record<ChipTone, string> = {
  neutral: 'bg-white/7 text-text-2',
  accent: 'bg-accent/12 text-accent',
  warn: 'bg-warn/16 text-warn',
  danger: 'bg-danger/14 text-danger',
  ok: 'bg-ok/14 text-ok',
};

export function Chip({
  tone = 'neutral',
  children,
  className,
  title,
}: {
  tone?: ChipTone | undefined;
  children: ReactNode;
  className?: string | undefined;
  title?: string | undefined;
}) {
  return (
    <span
      title={title}
      className={cx(
        'inline-flex items-center rounded-chip px-1.5 py-0.5 font-mono text-[10.5px] font-medium whitespace-nowrap',
        CHIP_TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export type StatusDotTone = 'ok' | 'warning' | 'error';

const DOT_TONE: Record<StatusDotTone, string> = {
  ok: 'bg-ok',
  warning: 'bg-warn',
  error: 'bg-danger',
};

const DOT_LABEL: Record<StatusDotTone, string> = {
  ok: 'No issues',
  warning: 'Has warnings',
  error: 'Has errors',
};

export function StatusDot({ tone, title }: { tone: StatusDotTone; title?: string | undefined }) {
  return (
    <span
      role="img"
      aria-label={title ?? DOT_LABEL[tone]}
      title={title ?? DOT_LABEL[tone]}
      className={cx('inline-block h-2 w-2 shrink-0 rounded-full', DOT_TONE[tone])}
    />
  );
}

export function CountBadge({
  count,
  onAccent = false,
}: {
  count: number;
  onAccent?: boolean | undefined;
}) {
  return (
    <span
      className={cx(
        'rounded-lg px-1.5 py-px font-mono text-[10.5px] font-semibold',
        onAccent ? 'bg-on-accent/25 text-on-accent' : 'bg-white/8 text-text-2',
      )}
    >
      {count}
    </span>
  );
}

export function WarningBadge({ count, title }: { count: number; title?: string | undefined }) {
  return (
    <span
      title={title}
      className="rounded-lg bg-warn/18 px-1.5 py-px font-mono text-[10.5px] font-semibold text-warn"
    >
      ⚠ {count}
    </span>
  );
}
