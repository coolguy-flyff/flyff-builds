import {
  ARMOR_PARTS,
  CLASS_IDS,
  GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID,
  GLORIA_PATRI_SKILL_ID,
  HEAL_RAIN_SKILL_ID,
  RM_BUFF_SKILL_IDS,
  requireItem,
  type GameData,
} from '@/data';
import {
  ACCESSORY_PIECE_KEYS,
  type AccessorySetEntry,
  type BuildState,
  type EquipmentSetEntry,
  type FashionSetEntry,
  type GearSwap,
  type ShieldEntry,
  type Stack,
  type WeaponEntry,
} from '@/domain/build/schema';
import {
  PET_TIERS,
  accessoryPieceItemId,
  accessoryPieceSource,
  petTierBreakdown,
  randomStatLineCount,
} from '@/domain/rules';
import { requireDefined } from '@/lib/assert';
import { roundTo } from '@/lib/math';

import type {
  FlyffAbility,
  FlyffEntity,
  FlyffItemElem,
  FlyffItemProp,
  FlyffRolledAbility,
  Flyffulator,
} from './flyffulator';

/**
 * Mirrors a build + swap onto a Flyffulator `Entity` exactly as its UI would have configured it:
 * items become `ItemElem`s with upgrades, awakes, chosen ranges, random stats, cards and jewels;
 * the fashion set becomes four real fashion pieces carrying the speed and blessing lines; buffs,
 * NPCs and achievements are activated; the context targets the Training Dummy.
 */

/** Flyffulator's max-buff assumption: the caster's INT is high enough for every scaling cap. */
const BUFFER_STAT = 1000;
const BLESSING_SLOTS_PER_PIECE = 2;
const FASHION_SLOTS = ['fashHelmet', 'fashSuit', 'fashGauntlets', 'fashBoots'] as const;
const FASHION_SUBCATEGORIES: Readonly<Record<(typeof FASHION_SLOTS)[number], string>> = {
  fashHelmet: 'hat',
  fashSuit: 'cloth',
  fashGauntlets: 'glove',
  fashBoots: 'shoes',
};
const MAX_SPEED_PER_PIECE = 5;

function itemProp(fl: Flyffulator, itemId: number): FlyffItemProp {
  return requireDefined(fl.Utils.getItemById(itemId), `Flyffulator has no item ${itemId}`);
}

function itemElem(fl: Flyffulator, itemId: number): FlyffItemElem {
  return new fl.ItemElem(itemProp(fl, itemId));
}

function findById<T extends { readonly id: number }>(
  entries: readonly T[],
  id: number | null,
): T | undefined {
  return id === null ? undefined : entries.find((entry) => entry.id === id);
}

/** Flyffulator stores one `ItemElem` per card unit; repeating the same instance is what its UI does. */
function expandStacks(fl: Flyffulator, stacks: readonly Stack[]): FlyffItemElem[] {
  const elems: FlyffItemElem[] = [];

  for (const stack of stacks) {
    const elem = itemElem(fl, stack.itemId);

    for (let unit = 0; unit < stack.count; unit += 1) {
      elems.push(elem);
    }
  }

  return elems;
}

function mirrorStatAwake(
  awake: readonly ({ readonly stat: string; readonly value: number } | null)[],
): FlyffItemElem['statAwake'] {
  return awake.map((line) => (line === null ? null : { parameter: line.stat, value: line.value }));
}

function mirrorWeapon(fl: Flyffulator, data: GameData, entry: WeaponEntry): FlyffItemElem | null {
  let elem: FlyffItemElem | null = null;

  if (entry.itemId !== null) {
    const item = requireItem(data, entry.itemId);

    elem = itemElem(fl, entry.itemId);
    elem.upgradeLevel = entry.upgrade;

    entry.statRanges.forEach((value, index) => {
      const range = elem?.statRanges[index];

      if (range !== undefined) {
        range.value = value;
      }
    });

    // The item editor splices lines 3/4 away below +6/+10 (itemedit.jsx:258-282).
    elem.randomStats = entry.randomStats
      .slice(0, randomStatLineCount(entry.upgrade))
      .map((line, index): FlyffRolledAbility | null => {
        let rolled: FlyffRolledAbility | null = null;

        if (line !== null) {
          const ability = requireDefined(
            item.possibleRandomStats?.find((candidate) => candidate.parameter === line.parameter),
            `${item.name} cannot roll ${line.parameter}`,
          );

          rolled = { ...ability, id: index, value: line.value };
        }

        return rolled;
      });
    elem.skillAwake =
      entry.skillAwake === null
        ? null
        : {
            id: entry.skillAwake.parameter,
            parameter: entry.skillAwake.parameter,
            add: entry.skillAwake.value,
          };
    elem.statAwake = mirrorStatAwake(entry.statAwake);
    elem.piercings = expandStacks(fl, entry.cards);
    // Left uncapped on purpose: Flyffulator's own `slice(0, upgradeLevel)` must match our cap.
    elem.ultimateJewels = expandStacks(fl, entry.jewels);
  }

  return elem;
}

function mirrorShield(fl: Flyffulator, entry: ShieldEntry): FlyffItemElem | null {
  let elem: FlyffItemElem | null = null;

  if (entry.itemId !== null) {
    elem = itemElem(fl, entry.itemId);
    elem.upgradeLevel = entry.upgrade;
    elem.skillAwake =
      entry.skillAwake === null
        ? null
        : {
            id: entry.skillAwake.parameter,
            parameter: entry.skillAwake.parameter,
            add: entry.skillAwake.value,
          };
    elem.statAwake = mirrorStatAwake(entry.statAwake);
    elem.piercings = expandStacks(fl, entry.cards);
  }

  return elem;
}

function mirrorEquipmentSet(
  fl: Flyffulator,
  data: GameData,
  entity: FlyffEntity,
  entry: EquipmentSetEntry,
): void {
  const set = entry.setId === null ? undefined : data.armorSets.get(entry.setId);

  if (set === undefined) {
    return;
  }

  const slots: Readonly<Record<(typeof ARMOR_PARTS)[number], string>> = {
    helmet: 'helmet',
    suit: 'suit',
    gauntlet: 'gauntlets',
    boots: 'boots',
  };

  for (const part of ARMOR_PARTS) {
    const elem = itemElem(fl, set.parts[part]);

    elem.upgradeLevel = entry.upgrade;
    // The entry stores overall awake totals; Flyffulator only sums flat per-piece lines, so the
    // whole total can sit on one piece (the helmet) without changing any stat.
    elem.statAwake = part === 'helmet' ? mirrorStatAwake(entry.statAwake) : [null, null];

    if (part === 'suit') {
      elem.piercings = expandStacks(fl, entry.suitCards);
    }

    entity.equipment[slots[part]] = elem;
  }
}

/** Each piece worn from its own set or CW jewel line; a CW jewel's tier is its own item, worn at +0. */
function mirrorAccessorySet(
  fl: Flyffulator,
  data: GameData,
  entity: FlyffEntity,
  entry: AccessorySetEntry,
): void {
  for (const piece of ACCESSORY_PIECE_KEYS) {
    const source = accessoryPieceSource(data, entry, piece);
    const itemId = accessoryPieceItemId(data, entry, piece);

    if (source !== null && itemId !== undefined) {
      const elem = itemElem(fl, itemId);

      elem.upgradeLevel = source.kind === 'set' ? entry.upgrades[piece] : 0;
      entity.equipment[piece] = elem;
    }
  }
}

/** A real fashion item of the subcategory whose only ability is `speed +N %` (none when N = 0). */
function findFashionItem(fl: Flyffulator, subcategory: string, speed: number): FlyffItemProp {
  const matches = (item: FlyffItemProp): boolean => {
    const abilities = item.abilities ?? [];
    let ok = item.category === 'fashion' && item.subcategory === subcategory;

    if (speed === 0) {
      ok = ok && abilities.length === 0;
    } else {
      ok =
        ok &&
        abilities.length === 1 &&
        abilities[0]?.parameter === 'speed' &&
        abilities[0].rate === true &&
        abilities[0].add === speed;
    }

    return ok;
  };

  return requireDefined(
    Object.values(fl.api.Items).find(matches),
    `No ${subcategory} fashion item with speed ${speed} %`,
  );
}

/** Fewest per-slot values reaching `total` (breadth-first over the slot count). */
function decomposeBlessing(values: readonly number[], total: number, maxSlots: number): number[] {
  let frontier: { sum: number; picks: number[] }[] = [{ sum: 0, picks: [] }];

  for (let slot = 1; slot <= maxSlots; slot += 1) {
    const next: typeof frontier = [];

    for (const state of frontier) {
      for (const value of values) {
        const sum = roundTo(state.sum + value, 3);
        const picks = [...state.picks, value];

        if (sum === total) {
          return picks;
        }

        if (sum < total) {
          next.push({ sum, picks });
        }
      }
    }

    frontier = next;
  }

  throw new Error(`Blessing total ${total} is not reachable with ${maxSlots} slots`);
}

function mirrorFashionSet(fl: Flyffulator, entity: FlyffEntity, entry: FashionSetEntry): void {
  const suitSpeed = Math.min(entry.speedPercent, MAX_SPEED_PER_PIECE);
  const speeds: Readonly<Record<(typeof FASHION_SLOTS)[number], number>> = {
    fashHelmet: 0,
    fashSuit: suitSpeed,
    fashGauntlets: 0,
    fashBoots: entry.speedPercent - suitSpeed,
  };
  const pieces = FASHION_SLOTS.map((slot) => {
    const elem = new fl.ItemElem(findFashionItem(fl, FASHION_SUBCATEGORIES[slot], speeds[slot]));

    elem.randomStats = [];
    entity.equipment[slot] = elem;

    return elem;
  });

  let cloak: FlyffItemElem | undefined;

  if (entry.cloakItemId !== null) {
    cloak = itemElem(fl, entry.cloakItemId);
    cloak.randomStats = [];
    entity.equipment.cloak = cloak;
  }

  const blessedPieces = cloak === undefined ? pieces : [...pieces, cloak];
  const blessingSlots: FlyffRolledAbility[] = [];
  const maxSlots = blessedPieces.length * BLESSING_SLOTS_PER_PIECE;

  for (const line of entry.blessings) {
    const abilities = fl.api.Blessings[line.parameter] ?? [];
    const values = abilities.map((ability) => ability.add).filter((value) => value > 0);
    const template: FlyffAbility = requireDefined(abilities[0], `No blessing ${line.parameter}`);

    for (const value of decomposeBlessing(values, line.total, maxSlots - blessingSlots.length)) {
      blessingSlots.push({ ...template, add: value, id: line.parameter, value });
    }
  }

  blessingSlots.forEach((slot, index) => {
    const piece = requireDefined(
      blessedPieces[Math.floor(index / BLESSING_SLOTS_PER_PIECE)],
      'piece',
    );

    piece.randomStats.push(slot);
  });
}

function mirrorPet(
  fl: Flyffulator,
  data: GameData,
  petItemId: number,
  total: number,
): FlyffItemElem {
  const def = requireDefined(
    data.pets.find((candidate) => candidate.petItemId === petItemId),
    `No pet ${petItemId}`,
  );
  const levels = requireDefined(petTierBreakdown(def, total), `Pet total ${total} unreachable`);
  const elem = itemElem(fl, petItemId);

  elem.petStats = Object.fromEntries(PET_TIERS.map((tier, index) => [tier, levels[index] ?? null]));

  return elem;
}

function mirrorBuffs(fl: Flyffulator, entity: FlyffEntity, build: BuildState): void {
  const buffs = build.buffs;

  entity.activeItems = buffs.premiumItemIds.map((itemId) => itemElem(fl, itemId));

  const activateMaxed = (skillId: number): void => {
    const skillProp = requireDefined(fl.Utils.getSkillById(skillId), `No skill ${skillId}`);
    const maxLevel = requireDefined(skillProp.levels.at(-1), `Skill ${skillId} has no levels`);

    entity.activeBuffs.push(new fl.Skill(skillProp, skillProp.levels.length, 1));

    // Synergies read the caster's learned levels; the engine assumes the source skill maxed.
    for (const synergy of maxLevel.synergies ?? []) {
      const source = requireDefined(
        fl.Utils.getSkillById(synergy.skill),
        `No skill ${synergy.skill}`,
      );

      entity.skillLevels[synergy.skill] = source.levels.length;
    }
  };

  if (buffs.rmBuffs.enabled) {
    const excluded = new Set(buffs.rmBuffs.excludedSkillIds);

    for (const skillId of RM_BUFF_SKILL_IDS) {
      if (!excluded.has(skillId)) {
        activateMaxed(skillId);
      }
    }
  }

  for (const skillId of buffs.classSkillIds) {
    activateMaxed(skillId);
  }

  const npc = (id: number): unknown => requireDefined(fl.api.HousingNPCs[String(id)], `NPC ${id}`);

  entity.activePersonalHousingNpcs = buffs.personalNpcIds.map(npc);
  entity.activeCoupleHousingNpcs = buffs.coupleNpcIds.map(npc);
  entity.activeGuildHousingNpcs = buffs.guildNpcIds.map(npc);

  if (buffs.achievementId !== null) {
    entity.activeAchievements = [
      requireDefined(
        fl.Utils.getAchievementById(buffs.achievementId),
        `No achievement ${buffs.achievementId}`,
      ),
    ];
  }
}

/** Healing rows read the attacker's skill levels; the engine assumes every skill maxed. */
function mirrorHealingSkills(fl: Flyffulator, entity: FlyffEntity): void {
  for (const skillId of [
    HEAL_RAIN_SKILL_ID,
    GLORIA_PATRI_SKILL_ID,
    GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID,
  ]) {
    const skillProp = requireDefined(fl.Utils.getSkillById(skillId), `No skill ${skillId}`);

    entity.skillLevels[skillId] = skillProp.levels.length;
  }
}

export function buildEntity(
  fl: Flyffulator,
  data: GameData,
  build: BuildState,
  swap: GearSwap,
): FlyffEntity {
  const entity = new fl.Entity(null);
  const page = requireDefined(findById(build.statPages, swap.statPageId), 'stat page');

  entity.job = fl.Utils.getClassById(build.character.jobId);
  entity.level = build.character.level;
  entity.str = page.str;
  entity.sta = page.sta;
  entity.dex = page.dex;
  entity.int = page.int;
  entity.bufferStr = BUFFER_STAT;
  entity.bufferSta = BUFFER_STAT;
  entity.bufferDex = BUFFER_STAT;
  entity.bufferInt = BUFFER_STAT;

  const weapon = findById(build.weapons, swap.weaponId);
  const mainhand = weapon === undefined ? null : mirrorWeapon(fl, data, weapon);

  entity.equipment.mainhand = mainhand ?? fl.Utils.DEFAULT_WEAPON;

  if (swap.offhand?.kind === 'shield') {
    const shield = findById(build.shields, swap.offhand.id);

    entity.equipment.offhand = shield === undefined ? null : mirrorShield(fl, shield);
  } else if (swap.offhand?.kind === 'weapon') {
    const offhand = findById(build.weapons, swap.offhand.id);

    entity.equipment.offhand = offhand === undefined ? null : mirrorWeapon(fl, data, offhand);
  }

  const equipment = findById(build.equipmentSets, swap.equipmentSetId);

  if (equipment !== undefined) {
    mirrorEquipmentSet(fl, data, entity, equipment);
  }

  const accessories = findById(build.accessorySets, swap.accessorySetId);

  if (accessories !== undefined) {
    mirrorAccessorySet(fl, data, entity, accessories);
  }

  const fashion = findById(build.fashionSets, swap.fashionSetId);

  if (fashion !== undefined) {
    mirrorFashionSet(fl, entity, fashion);
  }

  if (swap.maskItemId !== null) {
    entity.equipment.mask = itemElem(fl, swap.maskItemId);
  }

  const pet = findById(build.pets, swap.petId);

  if (pet?.petItemId !== null && pet?.petItemId !== undefined) {
    entity.equipment.pet = mirrorPet(fl, data, pet.petItemId, pet.total);
  }

  mirrorBuffs(fl, entity, build);

  if (build.character.jobId === CLASS_IDS.seraph) {
    mirrorHealingSkills(fl, entity);
  }

  entity.updateEquipSets();

  return entity;
}

/** Player vs. Training Dummy, auto attacks, full health — the calculations tab's defaults. */
export function installContext(fl: Flyffulator, entity: FlyffEntity): FlyffEntity {
  const dummy = new fl.Entity(fl.Utils.TRAINING_DUMMY);

  fl.Context.player = entity;
  fl.Context.attacker = entity;
  fl.Context.defender = dummy;
  fl.Context.attackFlags = fl.Utils.ATTACK_FLAGS.GENERIC;
  fl.Context.skill = null;
  fl.Context.settings.playerHealthPercent = 100;
  fl.Context.settings.targetHealthPercent = 100;

  return dummy;
}
