import { useMemo, useState } from 'react';

import { getItem, type SlimItem } from '@/data';
import { formatAbility, stackTotals, type Stack } from '@/domain/build';
import { maxStackCount, stackCount } from '@/domain/rules';
import { Button } from '@/components/Button';
import { SubCard, type StatusTone } from '@/components/Card';
import { ItemIcon } from '@/components/ItemIcon';
import { Stepper } from '@/components/Stepper';
import { Hint } from '@/components/Text';
import { cx } from '@/lib/cx';
import { useGameData } from '@/state';

import { plural, SEGMENT_SEPARATOR } from '../format';
import { StackItemPicker } from './StackItemPicker';
import {
  addStackUnits,
  fillRemainingWithLast,
  freeSlots,
  removeStack,
  replaceSlot,
  setStackCount,
  slotContents,
  sortStackOptions,
} from './stacks';

export interface StackEditorProps {
  title: string;
  note?: string | undefined;
  span?: boolean | undefined;
  /** "card" or "jewel" — used in button labels and hints. */
  noun: string;
  options: readonly SlimItem[];
  stacks: readonly Stack[];
  capacity: number;
  onChange: (stacks: Stack[]) => void;
  /** Short display name for the selected value (`cardShortName` / `jewelShortName`). */
  shorten: (name: string) => string;
  /** Header status; defaults to "N / M used". */
  formatStatus?: ((used: number, capacity: number) => string) | undefined;
}

function defaultStatus(used: number, capacity: number): string {
  return `${used} / ${capacity} used`;
}

function statusTone(used: number, capacity: number): StatusTone {
  let tone: StatusTone = 'muted';

  if (used > capacity) {
    tone = 'danger';
  } else if (used === capacity && capacity > 0) {
    tone = 'ok';
  }

  return tone;
}

/**
 * Stack editor for piercing cards and ultimate jewels (plan A2.0 / D3): rows of `item × count`
 * with the resolved effect, an always-available add picker and a per-slot strip (item icons) that
 * edits the same stacks one unit at a time. Runes can be slotted once per type. Over-capacity
 * stacks stay stored and turn the header red.
 */
export function StackEditor({
  title,
  note,
  span,
  noun,
  options,
  stacks,
  capacity,
  onChange,
  shorten,
  formatStatus = defaultStatus,
}: StackEditorProps) {
  const data = useGameData();
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const sorted = useMemo(() => sortStackOptions(options), [options]);
  const used = stackCount(stacks);
  const free = freeSlots(stacks, capacity);
  const excess = used - capacity;
  const slots = slotContents(stacks, capacity);
  const activeItemId = activeSlot === null ? null : (slots[activeSlot] ?? null);
  const activeOption =
    activeItemId === null ? null : (sorted.find((option) => option.id === activeItemId) ?? null);

  /** Units of an item across every stack (a slot edit can split one item into two stacks). */
  const countOf = (itemId: number): number =>
    stacks
      .filter((stack) => stack.itemId === itemId)
      .reduce((total, stack) => total + stack.count, 0);

  /** How many more units of the item the stacks accept (runes: one per type). */
  const allowance = (item: SlimItem): number => Math.max(maxStackCount(item) - countOf(item.id), 0);

  const addable = sorted.filter((option) => allowance(option) > 0);
  const slotOptions = sorted.filter(
    (option) => option.id === activeItemId || allowance(option) > 0,
  );
  const lastStack = stacks[stacks.length - 1];
  const lastItem = lastStack === undefined ? undefined : getItem(data, lastStack.itemId);
  const canFill =
    free > 0 && lastStack !== undefined && (lastItem === undefined || allowance(lastItem) > 0);

  return (
    <SubCard
      label={title}
      note={note}
      span={span}
      status={formatStatus(used, capacity)}
      statusTone={statusTone(used, capacity)}
    >
      <div className="flex flex-col gap-1.5">
        {stacks.map((stack, index) => {
          const item = getItem(data, stack.itemId);
          const name = item?.name ?? `#${stack.itemId}`;
          const countCap =
            item === undefined
              ? stack.count + free
              : Math.min(stack.count + free, maxStackCount(item));
          const effect = stackTotals(data, [stack])
            .map((ability) => formatAbility(data, ability.parameter, ability.add, ability.rate))
            .join(SEGMENT_SEPARATOR);

          return (
            <div
              key={`${index}-${stack.itemId}`}
              className="flex items-center gap-2 rounded-control bg-control px-2.5 py-[7px]"
            >
              {item !== undefined && <ItemIcon icon={item.icon} size={20} />}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[12px] text-text" title={name}>
                  {name}
                </div>
                <div className="font-mono text-[11px] break-words text-accent">{effect}</div>
              </div>
              <span className="text-[11px] text-dim">×</span>
              <Stepper
                size="compact"
                label={`${name} count`}
                value={stack.count}
                min={0}
                max={countCap}
                onChange={(count) => {
                  onChange(setStackCount(stacks, index, count));
                }}
              />
              <button
                type="button"
                aria-label={`Remove ${name}`}
                className="px-1 text-[12px] text-dim hover:text-text"
                onClick={() => {
                  onChange(removeStack(stacks, index));
                }}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      {capacity > 0 && (
        <div className="mt-2">
          <StackItemPicker
            options={addable}
            value={null}
            label={`Add ${noun}`}
            shorten={shorten}
            onChange={(item) => {
              if (item !== null && free > 0 && allowance(item) > 0) {
                onChange(addStackUnits(stacks, item.id, 1));
              }
            }}
          />
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Button
          size="sm"
          variant="control"
          disabled={!canFill}
          onClick={() => {
            onChange(fillRemainingWithLast(stacks, capacity));
          }}
        >
          Fill remaining with last
        </Button>
        <Button
          size="sm"
          variant="control"
          disabled={stacks.length === 0}
          onClick={() => {
            onChange([]);
            setActiveSlot(null);
          }}
        >
          Clear
        </Button>
      </div>
      {excess > 0 && (
        <Hint tone="danger" className="mt-2">
          {plural(excess, noun)} beyond the {capacity} available slots — ignored, last row first.
        </Hint>
      )}
      <div className="mt-2.5">
        <div role="group" aria-label={`${title} slots`} className="flex gap-1">
          {slots.map((itemId, slot) => {
            const item = itemId === null ? undefined : getItem(data, itemId);
            const slotName = item?.name ?? 'empty';

            return (
              <button
                key={slot}
                type="button"
                title={`Slot ${slot + 1}: ${slotName}`}
                aria-label={`Slot ${slot + 1}: ${slotName}`}
                aria-pressed={activeSlot === slot}
                className={cx(
                  'flex min-w-0 flex-1 items-center justify-center rounded-chip py-1 transition-colors',
                  slot >= capacity
                    ? 'bg-danger/14 text-danger'
                    : 'bg-control text-text-2 hover:bg-control-hover',
                  activeSlot === slot && 'outline-2 outline-accent',
                )}
                onClick={() => {
                  setActiveSlot(activeSlot === slot ? null : slot);
                }}
              >
                {item === undefined ? (
                  <span className="font-mono text-[11px] leading-[18px]">·</span>
                ) : (
                  <ItemIcon icon={item.icon} size={18} />
                )}
              </button>
            );
          })}
        </div>
        {activeSlot !== null && (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="shrink-0 text-[11px] text-muted">Slot {activeSlot + 1}</span>
            <div className="min-w-0 flex-1">
              <StackItemPicker
                options={slotOptions}
                value={activeOption}
                label={`Slot ${activeSlot + 1} ${noun}`}
                shorten={shorten}
                allowNone
                noneLabel="Empty slot"
                onChange={(item) => {
                  onChange(replaceSlot(stacks, activeSlot, item === null ? null : item.id));
                }}
              />
            </div>
          </div>
        )}
      </div>
    </SubCard>
  );
}
