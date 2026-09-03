import { ACCESSORY_LINE_NAMES } from '../../src/data/constants';
import {
  ACCESSORY_SLOTS,
  type AccessoryLine,
  type AccessoryLineTier,
  type AccessorySlot,
} from '../../src/data/schema';

import type { RawItem } from './source';

/**
 * Standalone accessory lines — the Clockworks "CW jewels" that can be mixed into an accessory set
 * (plan feedback 2026-09-03). Every "+N" is its own item in Items.json ("Speedo +1" … "Speedo
 * +5"; "Meteofy" has a single tier), so a line is resolved by name from the curated
 * `ACCESSORY_LINE_NAMES`. The conventions are asserted so a data refresh that breaks them fails the
 * pipeline loudly.
 */

export class AccessoryLineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AccessoryLineError';
  }
}

const TIER_SUFFIX = / \+(\d+)$/;

/** "Speedo +3" → Speedo at upgrade 3; a name without a suffix ("Meteofy") is upgrade 0. */
export function parseLineItemName(name: string): { name: string; upgrade: number } {
  const match = TIER_SUFFIX.exec(name);
  let parsed = { name, upgrade: 0 };

  if (match !== null) {
    parsed = { name: name.slice(0, match.index), upgrade: Number(match[1]) };
  }

  return parsed;
}

function isLineItem(item: RawItem, slot: AccessorySlot, lineName: string): boolean {
  return (
    item.category === 'jewelry' &&
    item.subcategory === slot &&
    parseLineItemName(item.name.en).name === lineName
  );
}

export function resolveAccessoryLine(
  lineName: string,
  slot: AccessorySlot,
  items: readonly RawItem[],
): AccessoryLine {
  const context = `Accessory line "${lineName}" (${slot})`;
  const lineItems = items
    .filter((item) => isLineItem(item, slot, lineName))
    .sort((a, b) => parseLineItemName(a.name.en).upgrade - parseLineItemName(b.name.en).upgrade);
  const first = lineItems[0];

  if (first === undefined) {
    throw new AccessoryLineError(`${context}: no items in Items.json`);
  }

  const tiers: AccessoryLineTier[] = [];
  const firstUpgrade = parseLineItemName(first.name.en).upgrade;

  for (const [index, item] of lineItems.entries()) {
    const { upgrade } = parseLineItemName(item.name.en);

    // "+N, +N+1, …" without gaps or duplicates, so the editor can offer a min…max stepper.
    if (upgrade !== firstUpgrade + index) {
      throw new AccessoryLineError(
        `${context}: tiers must be contiguous, found +${lineItems
          .map((candidate) => parseLineItemName(candidate.name.en).upgrade)
          .join(', +')}`,
      );
    }

    tiers.push({ upgrade, itemId: item.id });
  }

  return { id: first.id, name: lineName, slot, icon: first.icon, tiers };
}

/** Every curated line, rings first, in the order of `ACCESSORY_LINE_NAMES`. */
export function selectAccessoryLines(items: Readonly<Record<string, RawItem>>): AccessoryLine[] {
  const all = Object.values(items);
  const lines: AccessoryLine[] = [];

  for (const slot of ACCESSORY_SLOTS) {
    for (const name of ACCESSORY_LINE_NAMES[slot]) {
      lines.push(resolveAccessoryLine(name, slot, all));
    }
  }

  return lines;
}
