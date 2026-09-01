import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export function EmptyState({
  title,
  hint,
  action,
  className,
}: {
  title: ReactNode;
  hint?: ReactNode | undefined;
  action?: ReactNode | undefined;
  className?: string | undefined;
}) {
  return (
    <div className={cx('rounded-card bg-card px-5 py-8 text-center', className)}>
      <p className="text-[13px] text-text-2">{title}</p>
      {hint !== undefined && <p className="mt-1 text-[11px] text-dim">{hint}</p>}
      {action !== undefined && <div className="mt-3 flex justify-center">{action}</div>}
    </div>
  );
}
