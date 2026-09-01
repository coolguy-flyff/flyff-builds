import { useState, type KeyboardEvent } from 'react';

import { cx } from '@/lib/cx';
import { clamp } from '@/lib/math';

import { Button } from './Button';

export type StepperSize = 'compact' | 'md' | 'lg';

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
  /** Called when a requested value had to be clamped (e.g. no stat points remaining). */
  onClamp?: ((requested: number, applied: number) => void) | undefined;
  size?: StepperSize | undefined;
  quickPicks?: readonly number[] | undefined;
  format?: ((value: number) => string) | undefined;
  /** Accessible name; the buttons derive "Increase …" / "Decrease …" from it. */
  label: string;
  disabled?: boolean | undefined;
  /** Shows "mixed" instead of the value (an "all pieces" stepper whose pieces differ). */
  mixed?: boolean | undefined;
  className?: string | undefined;
}

const SIZE_CLASSES: Record<StepperSize, { button: string; value: string }> = {
  compact: { button: 'h-7 w-[26px] text-[13px]', value: 'h-7 w-[46px] text-[13px]' },
  md: { button: 'h-8 w-[30px] text-[14px]', value: 'h-8 w-14 text-[15px]' },
  lg: { button: 'h-9 w-[34px] text-[16px]', value: 'h-9 w-[70px] text-[17px]' },
};

interface ModifierKeys {
  readonly shiftKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
}

/** Click ±1 · Shift ±10 · Ctrl/Cmd ±100 (plan D4). */
function stepFor(keys: ModifierKeys): number {
  let step = 1;

  if (keys.ctrlKey || keys.metaKey) {
    step = 100;
  } else if (keys.shiftKey) {
    step = 10;
  }

  return step;
}

export function Stepper({
  value,
  min,
  max,
  onChange,
  onClamp,
  size = 'md',
  quickPicks,
  format = String,
  label,
  disabled = false,
  mixed = false,
  className,
}: StepperProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const sizes = SIZE_CLASSES[size];

  const commit = (requested: number): void => {
    const applied = clamp(Math.round(requested), min, max);

    if (applied !== requested) {
      onClamp?.(requested, applied);
    }

    if (applied !== value || mixed) {
      onChange(applied);
    }
  };

  const nudge = (direction: 1 | -1, keys: ModifierKeys): void => {
    commit(value + direction * stepFor(keys));
  };

  const commitDraft = (): void => {
    if (draft !== null) {
      const parsed = Number.parseInt(draft, 10);

      if (!Number.isNaN(parsed)) {
        commit(parsed);
      }

      setDraft(null);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      commitDraft();
      event.currentTarget.blur();
    } else if (event.key === 'Escape') {
      setDraft(null);
      event.currentTarget.blur();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      nudge(1, event);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      nudge(-1, event);
    }
  };

  let shown: string;

  if (draft !== null) {
    shown = draft;
  } else if (mixed) {
    shown = 'mixed';
  } else {
    shown = format(value);
  }

  const buttonClass = cx(
    'rounded-control bg-control font-mono text-text transition-colors hover:bg-control-hover disabled:cursor-not-allowed disabled:opacity-40',
    sizes.button,
  );

  return (
    <div className={cx('inline-flex flex-col gap-1.5', className)}>
      <div className="inline-flex items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          disabled={disabled || value <= min}
          onClick={(event) => {
            nudge(-1, event);
          }}
          className={buttonClass}
        >
          −
        </button>
        <input
          type="text"
          inputMode="numeric"
          aria-label={label}
          value={shown}
          disabled={disabled}
          onFocus={(event) => {
            setDraft(String(value));
            event.currentTarget.select();
          }}
          onChange={(event) => {
            setDraft(event.currentTarget.value);
          }}
          onBlur={commitDraft}
          onKeyDown={onKeyDown}
          className={cx(
            'rounded-control bg-control text-center font-mono font-semibold outline-none focus:bg-control-hover disabled:opacity-50',
            mixed && draft === null ? 'text-warn' : 'text-accent',
            sizes.value,
          )}
        />
        <button
          type="button"
          aria-label={`Increase ${label}`}
          disabled={disabled || value >= max}
          onClick={(event) => {
            nudge(1, event);
          }}
          className={buttonClass}
        >
          +
        </button>
      </div>
      {quickPicks !== undefined && (
        <div className="flex gap-1">
          {quickPicks.map((pick) => (
            <Button
              key={pick}
              size="xs"
              variant="control"
              active={!mixed && pick === value}
              disabled={disabled}
              onClick={() => {
                commit(pick);
              }}
              className="font-mono"
            >
              {format(pick)}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
