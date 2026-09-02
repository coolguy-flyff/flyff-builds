import { useState, type KeyboardEvent } from 'react';

import { cx } from '@/lib/cx';

export interface InlineNameProps {
  customName: string | undefined;
  autoName: string;
  onChange: (name: string | undefined) => void;
  /** Classes for the displayed name (size, rarity colour). */
  nameClassName?: string | undefined;
  maxLength?: number | undefined;
  className?: string | undefined;
}

/**
 * Entry name with inline editing (plan A2.0): pencil, F2 or double-click to edit; clearing the
 * text reverts to the auto-generated name, which stays visible as the placeholder.
 */
export function InlineName({
  customName,
  autoName,
  onChange,
  nameClassName,
  maxLength = 32,
  className,
}: InlineNameProps) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = customName ?? autoName;

  const start = (): void => {
    setDraft(customName ?? '');
  };

  const commit = (): void => {
    if (draft !== null) {
      const trimmed = draft.trim();
      onChange(trimmed === '' ? undefined : trimmed.slice(0, maxLength));
      setDraft(null);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') {
      commit();
    } else if (event.key === 'Escape') {
      setDraft(null);
    }
  };

  let content;

  if (draft !== null) {
    content = (
      <input
        autoFocus
        type="text"
        aria-label="Name"
        value={draft}
        placeholder={autoName}
        maxLength={maxLength}
        onChange={(event) => {
          setDraft(event.currentTarget.value);
        }}
        onBlur={commit}
        onKeyDown={onKeyDown}
        className={cx(
          'min-w-0 flex-1 rounded-control bg-control px-2 py-1 font-semibold text-text outline-none placeholder:font-normal placeholder:text-dim',
          nameClassName,
        )}
      />
    );
  } else {
    content = (
      <>
        <span
          tabIndex={0}
          onDoubleClick={start}
          onKeyDown={(event) => {
            if (event.key === 'F2') {
              event.preventDefault();
              start();
            }
          }}
          className={cx('min-w-0 font-semibold break-words', nameClassName)}
        >
          {shown}
        </span>
        <button
          type="button"
          aria-label="Rename"
          title="Rename"
          onClick={start}
          className="shrink-0 text-[12px] text-dim hover:text-text"
        >
          ✎
        </button>
        {customName === undefined ? (
          <span className="shrink-0 text-[11px] text-dim">auto name</span>
        ) : (
          <button
            type="button"
            aria-label="Restore auto name"
            title={`Restore auto name: ${autoName}`}
            onClick={() => {
              onChange(undefined);
            }}
            className="shrink-0 text-[12px] text-dim hover:text-text"
          >
            ↺
          </button>
        )}
      </>
    );
  }

  return <div className={cx('flex min-w-0 items-center gap-1.5', className)}>{content}</div>;
}
