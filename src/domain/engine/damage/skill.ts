import {
  ARMOR_PENETRATE_SKILL_ID,
  ASAL_SKILL_ID,
  HIT_OF_PENYA_SKILL_ID,
  skillAwakeParameter,
  SPIRIT_BOMB_SKILL_ID,
  type DamageSkill,
} from '@/data';

import type { EngineOptions } from '../options';
import { applySkillSynergies, computeStatScale } from '../skills/statScale';
import { computeWeaponAttackPower } from '../stats/attack';
import type { StatContext } from '../stats/context';
import { computeMp } from '../stats/vitals';
import { attackFromPower, attackMultiplier } from './attack';
import {
  applyAttackDefense,
  applyPartySkill,
  finishDamage,
  partySkillBonusPercent,
  pvpDamageFactor,
} from './defense';
import { mapRange, rangeAverage } from './range';
import type { DamageMode, DamageRange, DamageTarget, SkillDamage } from './types';

/**
 * Skill damage per hit (flyffdamagecalculator.js:1096-1187 for the power, 457-650 for the
 * defense and multipliers). Skills never crit; charged forms and buff-changed forms show their
 * plain base value.
 */

const SKILL_ATTACK_PARAMETER = 'attack';
/** The level-based factor of the skill power: `(16 + level) / 13` (DC:1124-1125). */
const SKILL_LEVEL_OFFSET = 16;
const SKILL_LEVEL_DIVISOR = 13;
const SKILL_ATTACK_SCALE = 5;
const SKILL_POWER_OFFSET = 20;
/** Weapon requirements naming two subcategories. */
const WEAPON_UNIONS: Readonly<Record<string, readonly string[]>> = {
  wandorstaff: ['wand', 'staff'],
  yoyoorbow: ['yoyo', 'bow'],
};
const SHIELD_REQUIREMENT = 'shield';
/** Asal's flat bonus per skill level (DC:481). */
const ASAL_BONUS_BY_LEVEL: readonly number[] = [20, 30, 40, 50, 60, 70, 80, 90, 100, 150];
/** Asal and Hit of Penya in PvP, Armor Penetrate always: the target's defense is halved. */
const HALVED_DEFENSE_FACTOR = 0.5;
const SPIRIT_BOMB_FACTOR = 2;
/** Magic skills of an element gain the matching mastery % (DC:1160-1180). */
const ELEMENT_MASTERIES: Readonly<Record<string, readonly string[]>> = {
  fire: ['firemastery'],
  fireearth: ['firemastery', 'earthmastery'],
  water: ['watermastery'],
  electricity: ['electricitymastery'],
  electricitywind: ['electricitymastery', 'windmastery'],
  wind: ['windmastery'],
  earth: ['earthmastery'],
  earthwind: ['earthmastery', 'windmastery'],
  earthwater: ['earthmastery', 'watermastery'],
};

function weaponSatisfies(requirement: string, subcategory: string | undefined): boolean {
  return (WEAPON_UNIONS[requirement] ?? [requirement]).includes(subcategory ?? '');
}

/**
 * Learned and equipped for: the character level reaches the skill's, and the weapon requirement
 * is met — in the mainhand, or a shield in the offhand (Flyffulator checks the mainhand only,
 * FLYFFULATOR_QUIRKS.skillWeaponCheckIgnoresShield).
 */
export function isSkillUsable(ctx: StatContext, skill: DamageSkill): boolean {
  let usable = skill.level <= ctx.level;

  if (usable && skill.weapon !== undefined) {
    if (skill.weapon === SHIELD_REQUIREMENT) {
      usable = ctx.offhand?.kind === 'shield';
    } else {
      usable = weaponSatisfies(skill.weapon, ctx.mainhand.item.subcategory);
    }
  }

  return usable;
}

function isBaseSkill(skill: DamageSkill): boolean {
  return skill.id === skill.familyId;
}

/**
 * Everything the damage formulas read from a skill, as one comparable string: two members of a
 * family with equal signatures deal identical damage (a variation that only changes a debuff or
 * its range, say). The special cases keyed by skill id (Asal, Hit of Penya, …) are base skills,
 * so a variation never differs by id alone; the arbitrary value only counts for Hit of Penya,
 * whose damage % it is — elsewhere it is a leap length, a toxin count or the like. Only the
 * `attack` scalings and synergies enter the power; a duration or charging-time scaling does not.
 */
export function skillDamageSignature(skill: DamageSkill): string {
  const attackOnly = <T extends { readonly parameter: string }>(entries: readonly T[]): T[] =>
    entries.filter((entry) => entry.parameter === SKILL_ATTACK_PARAMETER);

  return JSON.stringify({
    attack: skill.attack,
    multiplier: skill.multiplier,
    arbitraryValue: skill.familyId === HIT_OF_PENYA_SKILL_ID ? skill.arbitraryValue : undefined,
    magic: skill.magic,
    elementType: skill.elementType,
    weapon: skill.weapon,
    level: skill.level,
    levelCount: skill.levelCount,
    baseLevelCount: skill.baseLevelCount,
    hits: skill.hits,
    scalingParameters: attackOnly(skill.max.scalingParameters),
    synergies: attackOnly(skill.max.synergies),
  });
}

/** `getBaseSkillPower` before the roll (DC:1096-1146), both bounds. */
export function computeSkillPower(
  ctx: StatContext,
  skill: DamageSkill,
  mode: DamageMode,
): DamageRange {
  const formulaLevel = (isBaseSkill(skill) ? skill.levelCount : skill.baseLevelCount) - 1;
  const referStat = computeStatScale(ctx, skill.max.scalingParameters, {
    parameter: SKILL_ATTACK_PARAMETER,
    mode,
    level: formulaLevel,
    realScaleLevel: formulaLevel,
  });
  const weaponAttack = computeWeaponAttackPower(ctx, ctx.mainhand);
  const additional = ctx.mainhand.item.additionalSkillDamage ?? 0;
  const flat =
    ctx.total('damage', false) +
    Math.floor(ctx.total(`${ctx.mainhand.item.subcategory ?? ''}attack`, false));
  const powerOf = (weapon: number, attack: number): number =>
    ((weapon + (attack + additional) * SKILL_ATTACK_SCALE + referStat - SKILL_POWER_OFFSET) *
      (SKILL_LEVEL_OFFSET + formulaLevel)) /
      SKILL_LEVEL_DIVISOR +
    flat;

  return mapRange(
    {
      min: powerOf(weaponAttack.min, skill.attack.min),
      max: powerOf(weaponAttack.max, skill.attack.max),
    },
    (value) => applySkillSynergies(value, skill.max.synergies, SKILL_ATTACK_PARAMETER, mode),
  );
}

/** Just below 1: the highest value a roll can land on, as the parity suite feeds it. */
const HIGHEST_ROLL = 1 - 1e-9;

/**
 * The extremes of Flyffulator's roll `floor(min + r × (max − min + 1))` on fractional bounds
 * (FLYFFULATOR_QUIRKS.skillPowerSampleBounds): `floor(min)` and, in effect, `ceil(max)` — spelled
 * with the roll itself so float noise at an integer bound rounds the same way on both sides.
 */
function rolledBounds(power: DamageRange): DamageRange {
  return {
    min: Math.floor(power.min),
    max: Math.floor(power.min + HIGHEST_ROLL * (power.max - power.min + 1)),
  };
}

function elementMastery(ctx: StatContext, elementType: string | undefined): number {
  let bonus = 0;

  for (const parameter of ELEMENT_MASTERIES[elementType ?? ''] ?? []) {
    bonus += ctx.total(parameter, true);
  }

  return bonus;
}

/** `getMagicSkillPower` (DC:1148-1186): Magic Attack % and the element mastery on the roll. */
function magicPower(ctx: StatContext, skill: DamageSkill, rolled: number): number {
  let power = rolled;

  if (skill.magic) {
    power += Math.floor((power * ctx.total('magicattack', true)) / 100);

    const mastery = elementMastery(ctx, skill.elementType);

    if (mastery !== 0) {
      power = Math.floor(power * (1 + mastery / 100));
    }
  }

  return power;
}

function skillDefense(target: DamageTarget, skill: DamageSkill): number {
  let defense = skill.magic ? target.defense.magicSkill : target.defense.meleeSkill;
  const halvedInPvp = skill.id === ASAL_SKILL_ID || skill.id === HIT_OF_PENYA_SKILL_ID;

  if ((halvedInPvp && target.mode === 'pvp') || skill.id === ARMOR_PENETRATE_SKILL_ID) {
    defense = Math.floor(defense * HALVED_DEFENSE_FACTOR);
  }

  return defense;
}

/** Asal's bonus from STR, max MP and its level (DC:477-486, 905-913). */
function asalBonus(ctx: StatContext, skill: DamageSkill): number {
  const level = skill.levelCount;
  const add = ASAL_BONUS_BY_LEVEL[level - 1] ?? 0;

  return Math.floor(
    Math.floor(ctx.base('str') / 10) * level * (5 + Math.floor(computeMp(ctx) / 10)) + add,
  );
}

function withAsalBonus(damage: number, bonus: number): number {
  return damage > 0 ? damage + bonus : bonus;
}

/** `applyDefense` up to the multipliers (DC:457-497, 887-949) for one attack value. */
function damageAfterDefense(
  ctx: StatContext,
  skill: DamageSkill,
  attack: number,
  target: DamageTarget,
  defense: number,
): number {
  let damage: number;

  if (skill.magic) {
    let magicAttack = attack;

    if (skill.id === SPIRIT_BOMB_SKILL_ID) {
      magicAttack *= SPIRIT_BOMB_FACTOR;
    }

    magicAttack -= (magicAttack * target.magicResistance) / 100;

    if (skill.id === ASAL_SKILL_ID && target.mode === 'pvp') {
      magicAttack = withAsalBonus(magicAttack, asalBonus(ctx, skill));
    }

    damage = applyAttackDefense(magicAttack, defense);
  } else if (skill.id === HIT_OF_PENYA_SKILL_ID && target.mode === 'pve') {
    damage = attack;
  } else {
    damage = Math.max(applyAttackDefense(attack, defense), 0);
  }

  if (skill.id === ASAL_SKILL_ID && target.mode === 'pve') {
    damage = withAsalBonus(damage, asalBonus(ctx, skill));
  }

  return damage;
}

/**
 * A skill-damage awake on a held item names the base skill and covers its master variations too
 * (`Utils.isSkillOrInherit`, DC:582-586), so it is read by the family.
 */
function skillAwakeBonus(ctx: StatContext, skill: DamageSkill): number {
  return ctx.total(skillAwakeParameter(skill.familyId), true);
}

/** The skill's multipliers, specials and awake, then the PvP factor (DC:509-615). */
function skillFactor(
  ctx: StatContext,
  skill: DamageSkill,
  mode: DamageMode,
  skillAwake: number,
): number {
  let factor = skill.multiplier;

  if (skill.id === HIT_OF_PENYA_SKILL_ID) {
    factor *= (skill.arbitraryValue ?? 100) / 100;
  } else if (skill.id === ASAL_SKILL_ID) {
    factor *= 1 + ctx.total('asaldamage', true) / 100;
  }

  factor *= 1 + skillAwake / 100;
  factor *= pvpDamageFactor(mode);

  return factor;
}

export function computeSkillDamage(
  ctx: StatContext,
  skill: DamageSkill,
  target: DamageTarget,
  options: EngineOptions,
): SkillDamage {
  const power = computeSkillPower(ctx, skill, target.mode);
  const multiplier = attackMultiplier(ctx, skill);
  const attack = mapRange(rolledBounds(power), (rolled) =>
    attackFromPower(ctx, magicPower(ctx, skill, rolled), multiplier, target.mode),
  );
  const defense = skillDefense(target, skill);
  const skillAwake = skillAwakeBonus(ctx, skill);
  const factor = skillFactor(ctx, skill, target.mode, skillAwake);
  const range = mapRange(attack, (value) => {
    const damage = applyPartySkill(
      damageAfterDefense(ctx, skill, value, target, defense),
      target,
      options,
    );
    const scaled = damage <= 0 ? 0 : Math.floor(damage * factor);

    return finishDamage(scaled, ctx, target, options);
  });

  return {
    range,
    average: rangeAverage(range),
    hits: skill.hits,
    breakdown: {
      power,
      attack,
      attackMultiplier: multiplier,
      defense,
      factor,
      skillAwake,
      partyBonus: target.mode === 'pve' ? partySkillBonusPercent(options.partySkill) : 0,
    },
  };
}
