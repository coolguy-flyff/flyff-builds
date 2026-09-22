import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';

/** A switch followed by its label; clicking the label flips it too (unless disabled). */
export function SwitchLabel({
  label,
  checked,
  disabled = false,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean | undefined;
  onChange: (checked: boolean) => void;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1.5 text-[12px] whitespace-nowrap',
        checked ? 'text-text' : 'text-text-2',
        disabled && 'opacity-50',
      )}
    >
      <Toggle checked={checked} disabled={disabled} onChange={onChange} label={label} />
      <span
        className={cx('select-none', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}
        onClick={() => {
          if (!disabled) {
            onChange(!checked);
          }
        }}
      >
        {label}
      </span>
    </span>
  );
}
