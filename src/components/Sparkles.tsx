import type { CSSProperties } from 'react';

import { cx } from '@/lib/cx';

interface Star {
  /** Centre, in % of the layer. */
  readonly x: number;
  readonly y: number;
  readonly size: number;
  /** Animation delay in seconds, so the stars twinkle out of step. */
  readonly delay: number;
}

/** Fixed positions (not random) so renders and tests are stable; spread across the whole box. */
const STARS: readonly Star[] = [
  { x: 6, y: 25, size: 7, delay: 0 },
  { x: 17, y: 75, size: 5, delay: 0.5 },
  { x: 30, y: 18, size: 6, delay: 1.1 },
  { x: 44, y: 70, size: 8, delay: 0.25 },
  { x: 57, y: 28, size: 5, delay: 1.4 },
  { x: 70, y: 78, size: 7, delay: 0.7 },
  { x: 83, y: 20, size: 6, delay: 1.6 },
  { x: 94, y: 62, size: 5, delay: 0.9 },
];

/** Four-point star: long vertical and horizontal rays with a pinched centre. */
const STAR_PATH = 'M5 0 L6 4 L10 5 L6 6 L5 10 L4 6 L0 5 L4 4 Z';

/**
 * Twinkling stars over their parent (which must be `relative`): a decorative layer, clipped to the
 * parent's box so it never widens a scroll container, and still under `prefers-reduced-motion`.
 */
export function SparkleLayer({ className }: { className?: string | undefined }) {
  return (
    <span
      aria-hidden="true"
      className={cx('pointer-events-none absolute inset-0 overflow-hidden', className)}
    >
      {STARS.map((star) => {
        const style: CSSProperties = {
          left: `${star.x}%`,
          top: `${star.y}%`,
          width: star.size,
          height: star.size,
          animationDelay: `${star.delay}s`,
        };

        return (
          <svg
            key={`${star.x}-${star.y}`}
            viewBox="0 0 10 10"
            style={style}
            className="animate-twinkle absolute fill-sparkle drop-shadow-[0_0_3px_rgba(255,221,120,0.9)]"
          >
            <path d={STAR_PATH} />
          </svg>
        );
      })}
    </span>
  );
}
