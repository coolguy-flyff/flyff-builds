import { Switch } from '@headlessui/react';

import { cx } from '@/lib/cx';

export type ToggleSize = 'sm' | 'lg';

const SIZE_CLASSES: Record<ToggleSize, { track: string; knob: string }> = {
  sm: {
    track: 'h-[14px] w-6',
    knob: 'h-2.5 w-2.5 group-data-[checked]:translate-x-2.5',
  },
  lg: {
    track: 'h-[18px] w-8',
    knob: 'h-3.5 w-3.5 group-data-[checked]:translate-x-3.5',
  },
};

export function Toggle({
  checked,
  onChange,
  label,
  size = 'sm',
  disabled = false,
  className,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  size?: ToggleSize | undefined;
  disabled?: boolean | undefined;
  className?: string | undefined;
}) {
  const sizes = SIZE_CLASSES[size];

  return (
    <Switch
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      aria-label={label}
      className={cx(
        'group relative inline-flex shrink-0 items-center rounded-full bg-white/10 p-0.5 transition-colors data-[checked]:bg-accent/40 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        sizes.track,
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cx(
          'rounded-full bg-muted transition-transform group-data-[checked]:bg-accent',
          sizes.knob,
        )}
      />
    </Switch>
  );
}
