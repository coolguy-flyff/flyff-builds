import { cx } from '@/lib/cx';

export interface SegmentOption<V extends string> {
  value: V;
  label: string;
  disabled?: boolean | undefined;
  title?: string | undefined;
}

export function SegmentedControl<V extends string>({
  options,
  value,
  onChange,
  label,
  className,
}: {
  options: readonly SegmentOption<V>[];
  value: V;
  onChange: (value: V) => void;
  label: string;
  className?: string | undefined;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cx('inline-flex rounded-[7px] bg-control p-0.5', className)}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          disabled={option.disabled}
          title={option.title}
          onClick={() => {
            onChange(option.value);
          }}
          className={cx(
            'min-w-16 rounded-[5px] px-2.5 py-1 text-center text-[11px] font-medium transition-colors',
            option.value === value
              ? 'bg-accent font-semibold text-on-accent'
              : 'text-text-2 hover:text-text',
            option.disabled === true && 'cursor-not-allowed text-disabled hover:text-disabled',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
