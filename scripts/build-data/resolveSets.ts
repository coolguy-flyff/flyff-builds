import type {
  AccessorySet,
  ArmorPart,
  ArmorSet,
  PierceTarget,
  SetBonus,
  Sex,
} from '../../src/data/schema';
import { ARMOR_PARTS, SEXES } from '../../src/data/schema';

import { normalizeAbilities } from './project';
import type { RawEquipSet, RawItem } from './source';

/**
 * Cross-record resolution that the raw data only encodes by convention:
 *  - armor set parts are an unordered id list → keyed by subcategory;
 *  - accessory set parts mix ring/earring/necklace variants → keyed by variant parsed from names;
 *  - piercing cards carry no slot type → derived from the name suffix.
 * Every convention is asserted so a data refresh that breaks it fails the pipeline loudly.
 */

export class ResolveError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ResolveError';
  }
}

type ItemLookup = Readonly<Record<string, RawItem>>;

function requireItem(items: ItemLookup, id: number, context: string): RawItem {
  const item = items[String(id)];

  if (item === undefined) {
    throw new ResolveError(`${context}: item ${id} does not exist`);
  }

  return item;
}

function projectBonus(set: RawEquipSet): SetBonus[] {
  const bonus: SetBonus[] = [];

  for (const entry of set.bonus) {
    const [ability] = normalizeAbilities([entry.ability]);

    if (ability === undefined) {
      throw new ResolveError(`Set ${set.id} "${set.name.en}" has a bonus without a stat ability`);
    }

    bonus.push({ equipped: entry.equipped, ability });
  }

  return bonus;
}

function isArmorPart(value: string | undefined): value is ArmorPart {
  return value !== undefined && (ARMOR_PARTS as readonly string[]).includes(value);
}

function isSex(value: string | undefined): value is Sex {
  return value !== undefined && (SEXES as readonly string[]).includes(value);
}

export function resolveArmorSet(set: RawEquipSet, items: ItemLookup): ArmorSet {
  const context = `Armor set ${set.id} "${set.name.en}"`;
  const parts: Partial<Record<ArmorPart, number>> = {};
  let jobId: number | undefined;
  let sex: Sex | undefined;
  let level = 0;

  for (const partId of set.parts) {
    const item = requireItem(items, partId, context);

    if (!isArmorPart(item.subcategory)) {
      throw new ResolveError(
        `${context}: part ${partId} has subcategory "${item.subcategory ?? 'none'}"`,
      );
    }

    if (parts[item.subcategory] !== undefined) {
      throw new ResolveError(`${context}: duplicate ${item.subcategory} part`);
    }

    if (!isSex(item.sex)) {
      throw new ResolveError(`${context}: part ${partId} has no sex`);
    }

    parts[item.subcategory] = partId;
    jobId ??= item.class;
    sex ??= item.sex;
    level = Math.max(level, item.level);
  }

  const missing = ARMOR_PARTS.filter((part) => parts[part] === undefined);

  if (missing.length > 0 || jobId === undefined || sex === undefined) {
    throw new ResolveError(`${context}: incomplete (missing ${missing.join(', ') || 'job/sex'})`);
  }

  return {
    id: set.id,
    name: set.name.en,
    jobId,
    sex,
    level,
    parts: parts as ArmorSet['parts'],
    bonus: projectBonus(set),
  };
}

const ACCESSORY_SLOT_PATTERNS = {
  ring: / Ring$/,
  plug: / Plug Earring$/,
  demol: / Demol Earring$/,
  gore: / Gore Necklace$/,
  mental: / Mental Necklace$/,
  peision: / Peision Necklace$/,
} as const;

type AccessorySlot = keyof typeof ACCESSORY_SLOT_PATTERNS;

export function resolveAccessorySet(set: RawEquipSet, items: ItemLookup): AccessorySet {
  const context = `Accessory set ${set.id} "${set.name.en}"`;
  const slots: Partial<Record<AccessorySlot, number>> = {};

  for (const partId of new Set(set.parts)) {
    const item = requireItem(items, partId, context);
    const matches = (Object.keys(ACCESSORY_SLOT_PATTERNS) as AccessorySlot[]).filter((slot) =>
      ACCESSORY_SLOT_PATTERNS[slot].test(item.name.en),
    );
    const slot = matches[0];

    if (slot === undefined || matches.length > 1) {
      throw new ResolveError(`${context}: cannot classify part ${partId} "${item.name.en}"`);
    }

    if (slots[slot] !== undefined) {
      throw new ResolveError(`${context}: duplicate ${slot} part`);
    }

    slots[slot] = partId;
  }

  const { ring, plug, demol, gore, mental, peision } = slots;

  if (
    ring === undefined ||
    plug === undefined ||
    demol === undefined ||
    gore === undefined ||
    mental === undefined
  ) {
    throw new ResolveError(`${context}: missing ring/earring/necklace variants`);
  }

  const necklaces: AccessorySet['necklaces'] =
    peision === undefined ? { gore, mental } : { gore, mental, peision };

  return {
    id: set.id,
    name: set.name.en,
    ring,
    earrings: { plug, demol },
    necklaces,
    bonus: projectBonus(set),
  };
}

const SUIT_CARD_SUFFIX = /\(\d+%\)$/;
const WEAPON_CARD_SUFFIX = /\([A-D]\)$/;

/** Suit cards are named "(N%)", weapon/shield cards "(A)"…"(D)"; the data has no other marker. */
export function derivePierceTarget(item: RawItem): PierceTarget {
  const name = item.name.en.trim();
  let target: PierceTarget | undefined;

  if (SUIT_CARD_SUFFIX.test(name)) {
    target = 'suit';
  } else if (WEAPON_CARD_SUFFIX.test(name)) {
    target = 'weapon';
  }

  if (target === undefined) {
    throw new ResolveError(`Piercing card ${item.id} "${name}" has no recognised slot suffix`);
  }

  return target;
}
