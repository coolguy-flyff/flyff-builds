import { CLASS_IDS, type SlimItem } from '@/data';

/** Piercing slots per item type (Flyffulator flyffitemelem.js:154-172). */
export function piercingSlots(item: SlimItem): number {
  let slots = 0;

  if (item.subcategory === 'suit') {
    slots = 4;
  } else if (item.subcategory === 'shield') {
    slots = 5;
  } else if (item.category === 'weapon') {
    slots = item.twoHanded === true ? 10 : 5;
  }

  return slots;
}

function isOneHandedSwordOrAxe(item: SlimItem): boolean {
  return item.twoHanded !== true && (item.subcategory === 'sword' || item.subcategory === 'axe');
}

/**
 * Ultimate jewel slots (flyffitemelem.js:177-209): one per upgrade level, except one-handed swords
 * and axes which hold 5 until +7, 6 at +8/+9 and 7 at +10 — Templar's swords being the exception.
 */
export function ultimateJewelSlots(item: SlimItem, upgrade: number): number {
  let slots = 0;

  if (item.rarity === 'ultimate' && item.category === 'weapon') {
    const isTemplarSword = item.subcategory === 'sword' && item.class === CLASS_IDS.templar;

    if (isOneHandedSwordOrAxe(item) && !isTemplarSword) {
      slots = Math.min(upgrade, 5);

      if (upgrade >= 8) {
        slots = 6;
      }

      if (upgrade >= 10) {
        slots = 7;
      }
    } else {
      slots = upgrade;
    }
  }

  return slots;
}

/** Runes can be slotted once per type; stat gems stack freely (game rule). */
export function maxStackCount(item: SlimItem): number {
  return item.name.startsWith('Rune of ') ? 1 : Number.POSITIVE_INFINITY;
}

export function stackCount(stacks: readonly { count: number }[]): number {
  let total = 0;

  for (const stack of stacks) {
    total += stack.count;
  }

  return total;
}
