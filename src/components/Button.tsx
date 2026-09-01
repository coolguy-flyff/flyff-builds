import { forwardRef, type ButtonHTMLAttributes } from 'react';

import { cx } from '@/lib/cx';

export type ButtonVariant =
  'neutral' | 'primary' | 'danger' | 'soft' | 'outline' | 'ghost' | 'control';
export type ButtonSize = 'xs' | 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  /** Highlighted state for toggle-like buttons (quick picks, pills). */
  active?: boolean | undefined;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  neutral: 'bg-white/7 text-text hover:bg-white/10',
  primary: 'bg-accent font-semibold text-on-accent hover:brightness-110',
  danger: 'bg-danger/12 text-danger hover:bg-danger/20',
  soft: 'bg-accent/10 text-accent hover:bg-accent/16',
  outline: 'border border-white/12 text-text-2 hover:bg-white/5',
  ghost: 'text-muted hover:bg-white/5 hover:text-text',
  control: 'bg-control text-text hover:bg-control-hover',
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  xs: 'rounded-chip px-2 py-1 text-[11px]',
  sm: 'rounded-[7px] px-[11px] py-1.5 text-[12px]',
  md: 'rounded-control px-3.5 py-2 text-[12.5px]',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'neutral', size = 'md', active = false, className, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      data-active={active ? 'true' : undefined}
      className={cx(
        'inline-flex items-center justify-center gap-1.5 font-medium whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        active && 'bg-accent text-on-accent hover:bg-accent',
        className,
      )}
      {...rest}
    />
  );
});
