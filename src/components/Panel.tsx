import type { HTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

/** Floating surface for menus and popovers (plan D7). */
export function Panel({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cx('rounded-card bg-card p-3.5 shadow-panel', className)} {...rest} />;
}
