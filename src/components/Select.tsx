import { cx } from '@/lib/cx';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean | undefined;
  title?: string | undefined;
}

export interface SelectGroup {
  label: string;
  options: readonly SelectOption[];
}

export interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options?: readonly SelectOption[] | undefined;
  groups?: readonly SelectGroup[] | undefined;
  /** Shown (disabled) when `value` is the empty string. */
  placeholder?: string | undefined;
  label: string;
  id?: string | undefined;
  disabled?: boolean | undefined;
  invalid?: boolean | undefined;
  size?: 'sm' | 'md' | undefined;
  className?: string | undefined;
  /** Extra classes for the select element, e.g. a rarity colour. */
  valueClassName?: string | undefined;
}

/** Native select styled as a control (plan D5); accessible and keyboard-friendly by default. */
export function Select({
  value,
  onChange,
  options = [],
  groups = [],
  placeholder,
  label,
  id,
  disabled = false,
  invalid = false,
  size = 'md',
  className,
  valueClassName,
}: SelectProps) {
  return (
    <span className={cx('relative inline-flex w-full', className)}>
      <select
        id={id}
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.currentTarget.value);
        }}
        className={cx(
          'w-full appearance-none truncate rounded-control bg-control pr-7 text-text outline-none focus-visible:outline-2 focus-visible:outline-accent',
          size === 'sm' ? 'px-2.5 py-1.5 text-[12px]' : 'px-[11px] py-[7px] text-[12px]',
          invalid && 'text-danger outline-1 outline-danger',
          disabled && 'bg-sub opacity-55',
          valueClassName,
        )}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            title={option.title}
          >
            {option.label}
          </option>
        ))}
        {groups.map((group) => (
          <optgroup key={group.label} label={group.label}>
            {group.options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                title={option.title}
              >
                {option.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-[11px] text-dim"
      >
        ▾
      </span>
    </span>
  );
}
