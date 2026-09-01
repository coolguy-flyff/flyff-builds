import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

/**
 * Hover/focus tooltip (plan D7 menu-panel style): a real positioned panel, not the browser's
 * `title` bubble. Pure CSS — visible while the wrapper is hovered or holds focus.
 */
export function Tooltip({
  content,
  className,
  children,
}: {
  content: ReactNode;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <span className={cx('group/tip relative inline-flex min-w-0', className)}>
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-40 mb-1.5 w-max max-w-[280px] -translate-x-1/2 rounded-sub border border-white/15 bg-backdrop px-3 py-2 text-left text-[11.5px] leading-relaxed text-text-2 opacity-0 shadow-panel transition-opacity delay-100 group-focus-within/tip:opacity-100 group-hover/tip:opacity-100"
      >
        {content}
      </span>
    </span>
  );
}
