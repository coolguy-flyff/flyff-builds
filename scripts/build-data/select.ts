import { SKIN_ITEM_LEVEL, UPCUT_STONE_ITEM_ID } from '../../src/data/constants';

import type { RawClass, RawEquipSet, RawItem, RawPet } from './source';

/**
 * Selection predicates: which raw records make it into the slim bundle. Pure functions over the
 * raw shapes so they can be unit-tested with tiny fixtures.
 */

export function getThirdJobIds(classes: Readonly<Record<string, RawClass>>): Set<number> {
  const ids = new Set<number>();

  for (const cls of Object.values(classes)) {
    if (cls.type === 'specialist') {
      ids.add(cls.id);
    }
  }

  return ids;
}

/** `[jobId, parentId, …]` following `parent` links; unknown ids yield an empty chain. */
export function getClassChain(
  classes: Readonly<Record<string, RawClass>>,
  jobId: number,
): number[] {
  const chain: number[] = [];
  let current = classes[String(jobId)];

  while (current !== undefined) {
    chain.push(current.id);
    current = current.parent === undefined ? undefined : classes[String(current.parent)];
  }

  return chain;
}

export function getAllChainIds(
  classes: Readonly<Record<string, RawClass>>,
  thirdJobIds: ReadonlySet<number>,
): Set<number> {
  const ids = new Set<number>();

  for (const jobId of thirdJobIds) {
    for (const id of getClassChain(classes, jobId)) {
      ids.add(id);
    }
  }

  return ids;
}

function hasStatAbilities(item: RawItem): boolean {
  return (item.abilities ?? []).some(
    (ability) => ability.parameter !== undefined && ability.add !== undefined,
  );
}

/** Level-1 gear is a cosmetic skin with no place in a stat comparison. */
function isSkin(item: RawItem): boolean {
  return item.level <= SKIN_ITEM_LEVEL;
}

/**
 * Four armor parts for any job in a third-job chain — 1st/2nd-job and Vagrant sets included,
 * skins left out.
 */
export function isBundledArmorSet(
  set: RawEquipSet,
  items: Readonly<Record<string, RawItem>>,
  chainIds: ReadonlySet<number>,
): boolean {
  let eligible = false;

  if (set.parts.length === 4) {
    const parts = set.parts.map((id) => items[String(id)]);
    const first = parts[0];

    eligible =
      parts.every((part) => part?.category === 'armor' && !isSkin(part)) &&
      first?.class !== undefined &&
      chainIds.has(first.class);
  }

  return eligible;
}

/** Rare-and-above rarities are bundled; common/uncommon shop gear is left out. */
const BUNDLED_RARITIES: ReadonlySet<string> = new Set(['rare', 'veryrare', 'unique', 'ultimate']);

/** Weapons of rare+ rarity usable by any third-job chain, from every level except skins. */
export function isEligibleWeapon(item: RawItem, chainIds: ReadonlySet<number>): boolean {
  return (
    item.category === 'weapon' &&
    !isSkin(item) &&
    BUNDLED_RARITIES.has(item.rarity) &&
    (item.class === undefined || chainIds.has(item.class))
  );
}

/** Shields of rare+ rarity, skins excluded; class limits are applied per job at runtime. */
export function isEligibleShield(item: RawItem): boolean {
  return item.subcategory === 'shield' && !isSkin(item) && BUNDLED_RARITIES.has(item.rarity);
}

export function isStatCloak(item: RawItem): boolean {
  return item.subcategory === 'cloak' && item.name.en.trim() !== '' && hasStatAbilities(item);
}

export function isStatMask(item: RawItem): boolean {
  return item.subcategory === 'mask' && item.name.en.trim() !== '' && hasStatAbilities(item);
}

export function isPiercingCard(item: RawItem): boolean {
  return item.subcategory === 'piercingcard';
}

export function isUltimateJewel(item: RawItem): boolean {
  return item.subcategory === 'ultimatejewel';
}

export function isStatPet(item: RawItem, pets: Readonly<Record<string, RawPet>>): boolean {
  const def = pets[String(item.id)];

  return item.category === 'raisedpet' && def?.parameter !== undefined;
}

/**
 * Consumables that grant stats (Flyffulator's "powerup" condition), plus the Upcut Stone which has
 * no abilities but is special-cased by the attack formula.
 */
export function isPowerup(item: RawItem): boolean {
  const powerupLike =
    item.duration !== undefined || item.category === 'buff' || item.category === 'scroll';

  return item.id === UPCUT_STONE_ITEM_ID || (powerupLike && hasStatAbilities(item));
}
