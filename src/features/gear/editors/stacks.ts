import type { SlimItem } from '@/data';
import type { Stack } from '@/domain/build';
import { stackCount } from '@/domain/rules';

/**
 * Editing operations over card/jewel stacks (plan A2.0): the stacks are the single source of
 * truth; the per-slot strip is a projection of them, and slot edits move one unit between stacks.
 */

/** One item id per unit, in stack order (the order the engine fills slots in). */
export function stackUnits(stacks: readonly Stack[]): number[] {
  const units: number[] = [];

  for (const stack of stacks) {
    for (let unit = 0; unit < stack.count; unit += 1) {
      units.push(stack.itemId);
    }
  }

  return units;
}

export function freeSlots(stacks: readonly Stack[], capacity: number): number {
  return Math.max(capacity - stackCount(stacks), 0);
}

/** Drops empty stacks and merges neighbours holding the same item (a slot edit can split one). */
function normalizeStacks(stacks: readonly Stack[]): Stack[] {
  const merged: Stack[] = [];

  for (const stack of stacks) {
    const last = merged[merged.length - 1];

    if (stack.count <= 0) {
      // An emptied stack simply disappears.
    } else if (last?.itemId === stack.itemId) {
      merged[merged.length - 1] = { itemId: stack.itemId, count: last.count + stack.count };
    } else {
      merged.push({ itemId: stack.itemId, count: stack.count });
    }
  }

  return merged;
}

/** Groups consecutive units back into stacks. */
function stacksFromUnits(units: readonly number[]): Stack[] {
  return normalizeStacks(units.map((itemId) => ({ itemId, count: 1 })));
}

/** Sets one stack's count; a count of zero removes the stack. */
export function setStackCount(stacks: readonly Stack[], index: number, count: number): Stack[] {
  return normalizeStacks(
    stacks.map((stack, position) => (position === index ? { itemId: stack.itemId, count } : stack)),
  );
}

export function removeStack(stacks: readonly Stack[], index: number): Stack[] {
  return normalizeStacks(stacks.filter((_stack, position) => position !== index));
}

/** Adds units of an item, merging into its existing stack or appending a new one. */
export function addStackUnits(stacks: readonly Stack[], itemId: number, count: number): Stack[] {
  const index = stacks.findIndex((stack) => stack.itemId === itemId);
  let next: Stack[];

  if (index === -1) {
    next = [...stacks, { itemId, count }];
  } else {
    next = stacks.map((stack, position) =>
      position === index ? { itemId, count: stack.count + count } : stack,
    );
  }

  return next;
}

/** Tops the last stack up to the capacity. */
export function fillRemainingWithLast(stacks: readonly Stack[], capacity: number): Stack[] {
  const last = stacks[stacks.length - 1];
  const free = freeSlots(stacks, capacity);
  let next = [...stacks];

  if (last !== undefined && free > 0) {
    next = addStackUnits(stacks, last.itemId, free);
  }

  return next;
}

/** Item id per slot (null = free), padded to the capacity and extended when over it. */
export function slotContents(stacks: readonly Stack[], capacity: number): (number | null)[] {
  const units = stackUnits(stacks);
  const slots: (number | null)[] = [];

  for (let slot = 0; slot < Math.max(capacity, units.length); slot += 1) {
    slots.push(units[slot] ?? null);
  }

  return slots;
}

/**
 * Changes what one slot holds. The new unit stays in that very slot — the stack around it splits
 * if needed — and `null` empties the slot, the units after it closing the gap.
 */
export function replaceSlot(
  stacks: readonly Stack[],
  slot: number,
  itemId: number | null,
): Stack[] {
  const units = stackUnits(stacks);
  let next: Stack[] = [...stacks];

  if ((units[slot] ?? null) !== itemId) {
    const replacement = itemId === null ? [] : [itemId];

    if (slot < units.length) {
      units.splice(slot, 1, ...replacement);
    } else {
      units.push(...replacement);
    }

    next = stacksFromUnits(units);
  }

  return next;
}

export function firstUnusedOption(
  options: readonly SlimItem[],
  stacks: readonly Stack[],
): SlimItem | undefined {
  const used = new Set(stacks.map((stack) => stack.itemId));

  return options.find((option) => !used.has(option.id));
}

/** "Land Card (A)" → "Land"; "Shining Amethyst (10)" → "Amethyst"; "Rune of Attack" → "Runes". */
export function stackFamily(name: string): string {
  let family = name
    .replace(/^Shining /, '')
    .replace(/ \([^)]*\)$/, '')
    .replace(/ (Card|Jewel)$/, '');

  if (family.startsWith('Rune of ')) {
    family = 'Runes';
  }

  return family;
}

/** Strip chip text: family initial plus the grade or tier — "LA", "V7", "A10", "R". */
export function stackAbbreviation(name: string): string {
  const suffix = /\(([^)]*)\)$/.exec(name)?.[1]?.replace('%', '') ?? '';

  return `${stackFamily(name).charAt(0)}${suffix}`;
}

function firstAbilityValue(item: SlimItem): number {
  return item.abilities?.[0]?.add ?? 0;
}

/** Options grouped by family (alphabetical), each family ascending by strength. */
export function sortStackOptions(options: readonly SlimItem[]): SlimItem[] {
  return [...options].sort(
    (a, b) =>
      stackFamily(a.name).localeCompare(stackFamily(b.name)) ||
      firstAbilityValue(a) - firstAbilityValue(b),
  );
}
