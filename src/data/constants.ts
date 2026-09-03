/**
 * Game-data ids the app relies on by name. Ids come from the Flyff Universe API (api.flyff.com)
 * and are stable across data refreshes.
 */

/** Upcut Stone has no `abilities` in the data; its only effect is the ×1.2 attack multiplier. */
export const UPCUT_STONE_ITEM_ID = 8691;

/** Ringmaster/Assist buffs applied by the "Max RM buffs" toggle, at their maximum level. */
export const RM_BUFF_SKILL_IDS = [
  2678, // Patience
  3964, // Quick Step
  1129, // Mental Sign
  9852, // Haste
  7661, // Heap Up
  3721, // Cat's Reflex
  690, // Beef Up
  1029, // Cannon Ball
  6858, // Accuracy
  579, // Protect
  9047, // Spirit Fortune
  6845, // Geburah Tiphreth
] as const;

export const HEAL_SKILL_ID = 5653;
export const HEAL_RAIN_SKILL_ID = 7411;
export const GLORIA_PATRI_SKILL_ID = 28548;
export const GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID = 31249;

/** Skills whose max-level data is bundled (buffs + healing skills + synergy sources). */
export const BUNDLED_SKILL_IDS = [
  ...RM_BUFF_SKILL_IDS,
  HEAL_SKILL_ID,
  HEAL_RAIN_SKILL_ID,
  GLORIA_PATRI_SKILL_ID,
  GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID,
] as const;

/** The four "full ultimate" accessory sets (EquipSets.json ids). */
export const ACCESSORY_SET_IDS = {
  adepts: 12670,
  marksmans: 16509,
  defenders: 16809,
  champions: 17716,
} as const;

/**
 * The standalone "CW jewel" accessory lines that can be mixed into an accessory set, by slot.
 * Each name is an item family in Items.json ("Speedo +1" … "Speedo +5"; "Meteofy" alone); the
 * pipeline resolves them to {@link AccessoryLine}s in this order.
 */
export const ACCESSORY_LINE_NAMES = {
  ring: ['Strente', 'Intiret', 'Dexion', 'Meteor', 'Meteofy'],
  earring: ['Speedo', 'Penzeru', 'Mighteer'],
  necklace: ['Pep', 'Socecle', 'Enduky'],
} as const;

export const CLASS_IDS = {
  vagrant: 9686,
  assist: 8962,
  ringmaster: 9389,
  blade: 2246,
  templar: 29955,
  slayer: 35369,
  seraph: 26141,
} as const;

/**
 * Classes whose buffs the "Max RM buffs" card already covers; their skills are left out of the
 * class-skill lists of Seraphs and Forcemasters.
 */
export const RM_BUFF_CLASS_IDS: readonly number[] = [CLASS_IDS.assist, CLASS_IDS.ringmaster];

/** Level-1 weapons, shields and armor are cosmetic skins; real gear starts above this level. */
export const SKIN_ITEM_LEVEL = 1;

/**
 * Skill-chance abilities ("Stun chance +1–3%") are bundled under `skillchance:<skillId>`, with a
 * `:pve` / `:pvp` suffix when limited to one mode, so the modes stay separate stats. The API's own
 * name for the bare parameter ("Death's Rush Chance") is wrong for every other skill.
 */
export const SKILL_CHANCE_PREFIX = 'skillchance:';
