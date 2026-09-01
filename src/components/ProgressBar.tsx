import { cx } from '@/lib/cx';
import { clamp } from '@/lib/math';

export type ProgressTone = 'ok' | 'warn' | 'danger' | 'accent';

const TONE: Record<ProgressTone, string> = {
  ok: 'bg-ok',
  warn: 'bg-warn',
  danger: 'bg-danger',
  accent: 'bg-accent',
};

export function ProgressBar({
  fraction,
  tone = 'accent',
  label,
  className,
}: {
  fraction: number;
  tone?: ProgressTone | undefined;
  label: string;
  className?: string | undefined;
}) {
  const percent = Math.round(clamp(fraction, 0, 1) * 100);

  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      className={cx('h-1.5 w-full overflow-hidden rounded-[3px] bg-sub', className)}
    >
      <div
        className={cx('h-full rounded-[3px] transition-[width]', TONE[tone])}
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}
