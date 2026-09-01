import { cx } from '@/lib/cx';

export function DashedAddCard({
  label,
  hint,
  onClick,
  disabled = false,
  title,
  className,
}: {
  label: string;
  hint?: string | undefined;
  onClick: () => void;
  disabled?: boolean | undefined;
  title?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cx(
        'w-full rounded-row border-2 border-dashed border-accent/30 px-3 py-[13px] text-[13px] font-medium text-accent transition-colors hover:border-accent/50 hover:bg-accent/5 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
    >
      {label}
      {hint !== undefined && (
        <span className="mt-0.5 block text-[10.5px] font-normal text-dim">{hint}</span>
      )}
    </button>
  );
}
