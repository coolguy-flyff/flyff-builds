import {
  getStatName,
  UPCUT_STONE_ITEM_ID,
  type Ability,
  type GameData,
  type SlimItem,
  type SlimSkill,
} from '@/data';
import { formatAbility } from '@/domain/build';
import { maxedSkillContributions, type ContributionOriginKind } from '@/domain/engine';

/**
 * Text helpers for the buff sources shown on the Buffs tab. Every effect line goes through the
 * ability formatter the auto-names use, so "STR +40" reads the same everywhere in the app.
 */

export const EFFECT_SEPARATOR = ' · ';

/** Splits an effect line back into its stats, for tooltips that render one stat per line. */
export function splitEffectText(effect: string): string[] {
  return effect.split(EFFECT_SEPARATOR);
}

export const NO_EFFECT_TEXT = 'no stat effect';

/** "STR +10 · Hit Rate +8%" — one segment per ability, in data order; empty without abilities. */
export function formatAbilityList(data: GameData, abilities: readonly Ability[]): string {
  return abilities
    .map((ability) => formatAbility(data, ability.parameter, ability.add, ability.rate))
    .join(EFFECT_SEPARATOR);
}

/** Like {@link formatAbilityList}, with a marker for sources that grant no stats. */
export function effectTextOrNone(data: GameData, abilities: readonly Ability[]): string {
  const text = formatAbilityList(data, abilities);

  return text === '' ? NO_EFFECT_TEXT : text;
}

/**
 * The maxed effect of a buff or passive: max level, synergies maxed, caster-stat scaling at its
 * cap — e.g. "STR +40" for Beef Up, "Block +20% · Parry +20%" for Heaven's Step.
 */
export function maxedSkillEffect(
  data: GameData,
  skill: SlimSkill,
  kind: ContributionOriginKind,
): string {
  return effectTextOrNone(data, maxedSkillContributions(skill, kind));
}

/** Upcut Stone has no abilities in the data: its ×1.2 lives in the attack formula. */
export function premiumItemEffect(data: GameData, item: SlimItem): string {
  let effect: string;

  if (item.id === UPCUT_STONE_ITEM_ID) {
    effect = 'Attack ×1.2';
  } else {
    effect = effectTextOrNone(data, item.abilities ?? []);
  }

  return effect;
}

/** Text the premium-item search matches: the name plus the full names of the stats it grants. */
export function powerupSearchText(data: GameData, item: SlimItem): string {
  const statNames = (item.abilities ?? []).map((ability) => getStatName(data, ability.parameter));

  return [item.name, ...statNames].join(' ');
}

/** "2026 FWC Master" → "Master". */
export function achievementShortName(name: string): string {
  return name.replace(/^2026 FWC /, '');
}
