import { useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { cx } from '@/lib/cx';

export type TooltipPlacement = 'top' | 'bottom';

const PLACEMENT_CLASSES: Record<TooltipPlacement, string> = {
  top: 'bottom-full mb-1.5',
  bottom: 'top-full mt-1.5',
};

const PANEL =
  'pointer-events-none w-max max-w-[340px] rounded-sub border border-white/15 bg-backdrop px-3 py-2 text-left text-[11.5px] leading-relaxed whitespace-normal text-text-2 shadow-panel';

/**
 * Hover/focus tooltip (plan D7 menu-panel style): a real positioned panel, not the browser's
 * `title` bubble. Pure CSS — visible while the wrapper is hovered or holds keyboard focus
 * (`focus-visible`, so a mouse click does not pin it open).
 */
export function Tooltip({
  content,
  placement = 'top',
  className,
  children,
}: {
  content: ReactNode;
  placement?: TooltipPlacement | undefined;
  className?: string | undefined;
  children: ReactNode;
}) {
  return (
    <span className={cx('group/tip relative inline-flex min-w-0', className)}>
      {children}
      <span
        role="tooltip"
        className={cx(
          PANEL,
          'absolute left-1/2 z-40 -translate-x-1/2 opacity-0 transition-opacity delay-100 group-has-[:focus-visible]/tip:opacity-100 group-hover/tip:opacity-100',
          PLACEMENT_CLASSES[placement],
        )}
      >
        {content}
      </span>
    </span>
  );
}

const FLOATING_GAP_PX = 8;
const FLOATING_MAX_WIDTH_PX = 340;

/**
 * A tooltip that opens beside its anchor, rendered into `document.body` at fixed viewport
 * coordinates, so a scroll container (the results table) cannot clip it. Flips to the left when
 * the viewport has no room on the right.
 */
export function FloatingTooltip({
  content,
  className,
  children,
}: {
  content: ReactNode;
  className?: string | undefined;
  children: ReactNode;
}) {
  const anchorRef = useRef<HTMLSpanElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);

  const show = (): void => {
    setAnchor(anchorRef.current?.getBoundingClientRect() ?? null);
  };

  const hide = (): void => {
    setAnchor(null);
  };

  let panel: ReactNode = null;

  if (anchor !== null) {
    const fitsRight = anchor.right + FLOATING_GAP_PX + FLOATING_MAX_WIDTH_PX <= window.innerWidth;
    const style = fitsRight
      ? { left: anchor.right + FLOATING_GAP_PX, top: anchor.top + anchor.height / 2 }
      : {
          right: window.innerWidth - anchor.left + FLOATING_GAP_PX,
          top: anchor.top + anchor.height / 2,
        };

    panel = createPortal(
      <span role="tooltip" style={style} className={cx(PANEL, 'fixed z-50 -translate-y-1/2')}>
        {content}
      </span>,
      document.body,
    );
  }

  return (
    <span
      ref={anchorRef}
      className={cx('inline-flex min-w-0', className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {panel}
    </span>
  );
}
