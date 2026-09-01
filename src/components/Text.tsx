import type { LabelHTMLAttributes, ReactNode } from 'react';

import { cx } from '@/lib/cx';

export function FieldLabel({ className, ...rest }: LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cx(
        'block text-[10.5px] font-semibold tracking-[0.06em] text-muted uppercase',
        className,
      )}
      {...rest}
    />
  );
}

export type HintTone = 'dim' | 'muted' | 'warn' | 'danger';

const HINT_TONE: Record<HintTone, string> = {
  dim: 'text-dim',
  muted: 'text-muted',
  warn: 'text-warn',
  danger: 'text-danger',
};

export function Hint({
  children,
  tone = 'dim',
  className,
}: {
  children: ReactNode;
  tone?: HintTone | undefined;
  className?: string | undefined;
}) {
  return <p className={cx('text-[10.5px] leading-snug', HINT_TONE[tone], className)}>{children}</p>;
}
