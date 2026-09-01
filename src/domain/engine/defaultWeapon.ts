import type { SlimItem } from '@/data';

/**
 * Bare hands: the weapon every character holds when no weapon is selected (Flyffulator
 * flyffutils.js:5-14). It has no upgrade, no rarity offset and a fixed attack-speed value.
 */
export const DEFAULT_WEAPON: SlimItem = Object.freeze({
  id: -1,
  name: 'Bare hands',
  icon: 'mainhand.png',
  level: 1,
  category: 'weapon',
  subcategory: 'hand',
  rarity: 'common',
  minAttack: 1,
  maxAttack: 2,
  attackSpeedValue: 0.07,
  additionalSkillDamage: 0,
});
