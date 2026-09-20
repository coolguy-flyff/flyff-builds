import { mix } from '@/lib/math';

import type { EngineOptions, PartySkill } from '../options';
import type { StatContext } from '../stats/context';
import { PVP_FACTOR } from './target';
import type { DamageMode, DamageTarget } from './types';

/** The game's defense correction (flyffdamagecalculator.js:1021-1031). */
export function applyAttackDefense(attack: number, defense: number): number {
  const sum = defense + 2 * attack;
  let value = 0;

  if (defense > 0 && sum > 1) {
    value = Math.sqrt(defense / sum);
  }

  return attack - Math.floor(mix(defense, attack, value));
}

/** Incoming damage below this is ignored ("Templar's Last One Standing doesn't have a cap"). */
const INCOMING_DAMAGE_FLOOR = -50;
/** The most a player's damage reduction can take off (flyffdamagecalculator.js:182). */
const DAMAGE_REDUCTION_CAP = 50;
/** Muran's Wrath applies to a target at full health, at half strength in PvP. */
const FULL_HEALTH_PERCENT = 100;

function damageRateParameter(mode: DamageMode): string {
  return mode === 'pvp' ? 'pvpdamage' : 'pvedamage';
}

/**
 * The tail of `getDamage` (flyffdamagecalculator.js:108-220) for one hit: the attacker's PvE/PvP
 * damage %, Muran's Wrath, the target's incoming damage and — for a player — its damage
 * reduction. Elements, debuff conditions, giants, hymns and Ankou's Harvest are not modeled.
 */
export function finishDamage(
  total: number,
  ctx: StatContext,
  target: DamageTarget,
  options: EngineOptions,
): number {
  let damage = total;

  damage += Math.floor((damage * ctx.total(damageRateParameter(target.mode), true)) / 100);

  let muransWrath = ctx.total('muranswrath', true);

  if (muransWrath > 0 && options.targetHealthPercent === FULL_HEALTH_PERCENT) {
    if (target.mode === 'pvp') {
      muransWrath /= 2;
    }

    damage += Math.floor((damage * muransWrath) / 100);
  }

  damage += Math.floor((damage * Math.max(target.incomingDamage, INCOMING_DAMAGE_FLOOR)) / 100);

  if (target.mode === 'pvp') {
    damage -= Math.floor((damage * Math.min(DAMAGE_REDUCTION_CAP, target.damageReduction)) / 100);
  }

  return Math.max(damage, 1);
}

/** Player-versus-player damage is scaled down (flyffdamagecalculator.js:613-615). */
export function pvpDamageFactor(mode: DamageMode): number {
  return mode === 'pvp' ? PVP_FACTOR : 1;
}

/** The party the party skills are computed for: a full one. */
export const PARTY_MEMBERS = 8;
/** Bonus per party member: Global Attack (the leader's) and Linked Attack (DC:1236-1250). */
const PARTY_SKILL_PER_MEMBER: Readonly<Record<PartySkill, number>> = {
  none: 0,
  linked: 0.025,
  global: 0.05,
};

/** The party skill's bonus in %, as the cell tooltip reports it (40 for Global Attack). */
export function partySkillBonusPercent(partySkill: PartySkill): number {
  return PARTY_MEMBERS * PARTY_SKILL_PER_MEMBER[partySkill] * 100;
}

/**
 * `computePartyLinkGlobalAttackDamage` (flyffdamagecalculator.js:1236-1250): a player hitting a
 * monster gains `floor(damage × members × per-member)` right after the defense, before the
 * skill or crit factor. Nothing against players or on a hit that dealt nothing.
 */
export function applyPartySkill(
  damage: number,
  target: DamageTarget,
  options: EngineOptions,
): number {
  let total = damage;

  if (target.mode === 'pve' && damage > 0) {
    total += Math.floor(damage * PARTY_MEMBERS * PARTY_SKILL_PER_MEMBER[options.partySkill]);
  }

  return total;
}
