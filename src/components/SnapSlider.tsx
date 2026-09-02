import type { CSSProperties } from 'react';

import { cx } from '@/lib/cx';

import { Button } from './Button';

export type SnapSliderTone = 'accent' | 'rand1' | 'rand2';

const TONE_TEXT: Record<SnapSliderTone, string> = {
  accent: 'text-accent',
  rand1: 'text-rand1',
  rand2: 'text-rand2',
};

const TONE_FILL: Record<SnapSliderTone, string | undefined> = {
  accent: undefined,
  rand1: 'var(--color-rand1)',
  rand2: 'var(--color-rand2)',
};

export interface SnapSliderProps {
  /** Allowed values from weakest to strongest; the knob snaps between them and Max picks the last. */
  options: readonly number[];
  value: number;
  onChange: (value: number) => void;
  format?: ((value: number) => string) | undefined;
  label: string;
  disabled?: boolean | undefined;
  showMax?: boolean | undefined;
  /** Fill and value colour; ultimate random stats use rand1/rand2. */
  tone?: SnapSliderTone | undefined;
  className?: string | undefined;
}

function nearestIndex(options: readonly number[], value: number): number {
  let best = 0;
  let bestDistance = Number.POSITIVE_INFINITY;

  options.forEach((option, index) => {
    const distance = Math.abs(option - value);

    if (distance < bestDistance) {
      bestDistance = distance;
      best = index;
    }
  });

  return best;
}

export function SnapSlider({
  options,
  value,
  onChange,
  format = String,
  label,
  disabled = false,
  showMax = false,
  tone = 'accent',
  className,
}: SnapSliderProps) {
  const index = nearestIndex(options, value);
  const last = options.length - 1;
  const fill = last <= 0 ? 0 : (index / last) * 100;
  const style: CSSProperties & Record<string, string> = { '--fill': `${fill}%` };
  const fillColor = TONE_FILL[tone];

  if (fillColor !== undefined) {
    style['--slider-fill'] = fillColor;
  }

  const max = options[last];

  return (
    <div className={cx('flex items-center gap-2.5', className)}>
      <input
        type="range"
        className="snap-slider min-w-0 flex-1"
        style={style}
        min={0}
        max={Math.max(last, 0)}
        step={1}
        value={index}
        disabled={disabled || options.length === 0}
        aria-label={label}
        aria-valuetext={format(value)}
        onChange={(event) => {
          const next = options[Number(event.currentTarget.value)];

          if (next !== undefined) {
            onChange(next);
          }
        }}
      />
      <span
        className={cx('min-w-10 text-right font-mono text-[13px] font-semibold', TONE_TEXT[tone])}
      >
        {format(value)}
      </span>
      {showMax && (
        <Button
          size="xs"
          variant="control"
          disabled={disabled || max === undefined || max === value}
          onClick={() => {
            if (max !== undefined) {
              onChange(max);
            }
          }}
        >
          Max
        </Button>
      )}
    </div>
  );
}
