import {
  Combobox,
  ComboboxButton,
  ComboboxInput,
  ComboboxOption,
  ComboboxOptions,
} from '@headlessui/react';
import { Fragment, useMemo, useState, type ReactNode } from 'react';

import { cx } from '@/lib/cx';
import { matchesQuery } from '@/lib/search';

export interface OptionState {
  focus: boolean;
  selected: boolean;
}

export interface EntityComboboxProps<T> {
  options: readonly T[];
  value: T | null;
  onChange: (value: T | null) => void;
  getKey: (option: T) => string | number;
  getLabel: (option: T) => string;
  /** Text the query is matched against; defaults to the label. */
  getSearchText?: ((option: T) => string) | undefined;
  /** Group header per option; groups keep the order of first appearance. */
  groupBy?: ((option: T) => string) | undefined;
  renderOption?: ((option: T, state: OptionState) => ReactNode) | undefined;
  /** Icon shown left of the input for the selected value. */
  leading?: ReactNode | undefined;
  /** Meta line under the value (level, type, attack …). */
  meta?: ReactNode | undefined;
  placeholder?: string | undefined;
  /** Render options only once the query has at least this many characters (large lists lag). */
  minQueryLength?: number | undefined;
  allowNone?: boolean | undefined;
  noneLabel?: string | undefined;
  label: string;
  disabled?: boolean | undefined;
  className?: string | undefined;
  inputClassName?: string | undefined;
}

interface OptionGroup<T> {
  readonly label: string | null;
  readonly options: T[];
}

function groupOptions<T>(
  options: readonly T[],
  groupBy: ((option: T) => string) | undefined,
): OptionGroup<T>[] {
  const groups = new Map<string | null, OptionGroup<T>>();

  for (const option of options) {
    const label = groupBy === undefined ? null : groupBy(option);
    let group = groups.get(label);

    if (group === undefined) {
      group = { label, options: [] };
      groups.set(label, group);
    }

    group.options.push(option);
  }

  return [...groups.values()];
}

/**
 * Searchable picker over game entities (plan A5.3): type to filter instantly, arrow keys, Enter,
 * Escape. Built on Headless UI's Combobox; option rows are rendered by the caller.
 */
export function EntityCombobox<T>({
  options,
  value,
  onChange,
  getKey,
  getLabel,
  getSearchText,
  groupBy,
  renderOption,
  leading,
  meta,
  placeholder = 'Search…',
  minQueryLength = 0,
  allowNone = false,
  noneLabel = 'None',
  label,
  disabled = false,
  className,
  inputClassName,
}: EntityComboboxProps<T>) {
  const [query, setQuery] = useState('');
  const searchText = getSearchText ?? getLabel;

  const groups = useMemo(() => {
    const trimmed = query.trim();
    let filtered: readonly T[];

    if (trimmed.length < minQueryLength) {
      filtered = [];
    } else if (trimmed === '') {
      filtered = options;
    } else {
      filtered = options.filter((option) => matchesQuery(searchText(option), query));
    }

    return groupOptions(filtered, groupBy);
  }, [options, query, searchText, groupBy, minQueryLength]);

  const compare = (a: T | null, b: T | null): boolean =>
    a === b || (a !== null && b !== null && getKey(a) === getKey(b));

  const optionClass = (focus: boolean): string =>
    cx(
      'cursor-pointer rounded-[7px] px-2.5 py-1.5 text-[12.5px] text-text select-none',
      focus && 'bg-control',
    );

  return (
    <Combobox
      value={value}
      onChange={onChange}
      by={compare}
      disabled={disabled}
      immediate
      onClose={() => {
        setQuery('');
      }}
    >
      <div
        className={cx(
          'relative flex items-center gap-2.5 rounded-control bg-control px-3 py-2',
          disabled && 'opacity-55',
          className,
        )}
      >
        {leading}
        <div className="min-w-0 flex-1">
          <ComboboxInput
            aria-label={label}
            autoComplete="off"
            spellCheck={false}
            displayValue={(option: T | null) => (option === null ? '' : getLabel(option))}
            placeholder={placeholder}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            className={cx(
              'w-full bg-transparent text-[13px] font-semibold text-text outline-none placeholder:font-normal placeholder:text-dim',
              inputClassName,
            )}
          />
          {meta !== undefined && (
            <div className="truncate font-mono text-[11px] text-muted">{meta}</div>
          )}
        </div>
        <ComboboxButton aria-label={`Open ${label} options`} className="text-[12px] text-dim">
          ▾
        </ComboboxButton>
      </div>
      <ComboboxOptions
        anchor="bottom start"
        transition
        className="z-50 w-[max(var(--input-width),22rem)] max-w-[calc(100vw-2rem)] rounded-sub bg-sub p-1.5 shadow-panel [--anchor-gap:6px] [--anchor-max-height:22rem] data-[closed]:opacity-0"
      >
        {allowNone && (
          <ComboboxOption value={null}>
            {({ focus }) => <div className={cx(optionClass(focus), 'text-muted')}>{noneLabel}</div>}
          </ComboboxOption>
        )}
        {groups.map((group) => (
          <Fragment key={group.label ?? ''}>
            {group.label !== null && (
              <div className="px-2.5 pt-2 pb-1 text-[10.5px] font-semibold tracking-[0.06em] text-dim uppercase">
                {group.label}
              </div>
            )}
            {group.options.map((option) => (
              <ComboboxOption key={getKey(option)} value={option}>
                {({ focus, selected }) => (
                  <div className={optionClass(focus)}>
                    {renderOption === undefined
                      ? getLabel(option)
                      : renderOption(option, { focus, selected })}
                  </div>
                )}
              </ComboboxOption>
            ))}
          </Fragment>
        ))}
        {groups.length === 0 && (
          <div className="px-2.5 py-2 text-[12px] text-dim">
            {query.trim().length < minQueryLength ? 'Type to search…' : 'No matches'}
          </div>
        )}
      </ComboboxOptions>
    </Combobox>
  );
}
