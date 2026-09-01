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

/** Sets one stack's count; a count of zero removes the stack. */
export function setStackCount(stacks: readonly Stack[], index: number, count: number): Stack[] {
  return stacks
    .map((stack, position) => (position === index ? { itemId: stack.itemId, count } : stack))
    .filter((stack) => stack.count > 0);
}

export function removeStack(stacks: readonly Stack[], index: number): Stack[] {
  return stacks.filter((_stack, position) => position !== index);
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

function stackIndexOfUnit(stacks: readonly Stack[], unit: number): number {
  let offset = 0;
  let owner = -1;

  for (const [index, stack] of stacks.entries()) {
    offset += stack.count;

    if (unit < offset) {
      owner = index;
      break;
    }
  }

  return owner;
}

/** Changes what one slot holds by moving a unit between stacks (`null` empties the slot). */
export function replaceSlot(
  stacks: readonly Stack[],
  slot: number,
  itemId: number | null,
): Stack[] {
  const current = stackUnits(stacks)[slot] ?? null;
  let next: Stack[] = [...stacks];

  if (current !== itemId) {
    if (current !== null) {
      const owner = stackIndexOfUnit(stacks, slot);
      const count = stacks[owner]?.count ?? 1;
      next = setStackCount(next, owner, count - 1);
    }

    if (itemId !== null) {
      next = addStackUnits(next, itemId, 1);
    }
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
