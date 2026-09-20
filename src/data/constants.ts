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

/**
 * The damage skills the results compare (plan §7), base skills only in display order: each third
 * job's own attack skills by level, then its second job's. Master variations come along through
 * the base's `masterVariations` list. Pure debuff/utility skills are pruned by the user over time.
 */
export const DAMAGE_SKILL_IDS: readonly number[] = [
  // Arcanist
  26287, // Ice Shard (Arcanist, Lv 166)
  37809, // EVA Storm (Arcanist, Lv 166)
  42119, // Entangling Roots (Arcanist, Lv 166)
  49743, // Gale (Arcanist, Lv 166)
  49938, // Incinerate (Arcanist, Lv 166)
  22731, // Thunder Strike (Arcanist, Lv 170)
  36544, // Stone Pillar (Arcanist, Lv 170)
  42871, // Ignite (Arcanist, Lv 170)
  44237, // Tidal Omen (Arcanist, Lv 170)
  48214, // Gust (Arcanist, Lv 170)
  35720, // Hellfire (Arcanist, Lv 175)
  51139, // Swampy Area (Arcanist, Lv 175)
  935, // Stone Spear (Elementor, Lv 60)
  3623, // Void (Elementor, Lv 60)
  3956, // Firebird (Elementor, Lv 60)
  6808, // Lightning Strike (Elementor, Lv 60)
  9293, // Iceshark (Elementor, Lv 60)
  5171, // Electric Shock (Elementor, Lv 65)
  6390, // Windfield (Elementor, Lv 65)
  6741, // Burningfield (Elementor, Lv 65)
  8059, // Earthquake (Elementor, Lv 65)
  9628, // Poison Cloud (Elementor, Lv 65)
  835, // Meteo Shower (Elementor, Lv 70)
  3685, // Sandstorm (Elementor, Lv 70)
  7080, // Lightning Storm (Elementor, Lv 70)
  7701, // Blizzard (Elementor, Lv 75)
  // Crackshooter
  49878, // Condor Dive (Crackshooter, Lv 166)
  51050, // Heavy Shot (Crackshooter, Lv 166)
  38174, // Repelling Shot (Crackshooter, Lv 170)
  563, // Ice Arrow (Ranger, Lv 60)
  6157, // Poison Arrow (Ranger, Lv 60)
  6216, // Flame Arrow (Ranger, Lv 60)
  8094, // Piercing Arrow (Ranger, Lv 70)
  8510, // Silent Arrow (Ranger, Lv 75)
  4978, // Triple Shot (Ranger, Lv 80)
  1906, // Boomburst (Ranger, Lv 100)
  // Forcemaster
  25691, // Power Palm (Forcemaster, Lv 166)
  38428, // Nen Sphere (Forcemaster, Lv 166)
  38988, // Aura Bomb (Forcemaster, Lv 170)
  41109, // Initiating Strike (Forcemaster, Lv 170)
  56047, // Staggering Strike (Forcemaster, Lv 175)
  1432, // Piercing Serpent (Billposter, Lv 60)
  3228, // Baraqijal Esna (Billposter, Lv 65)
  4448, // Belial Smashing (Billposter, Lv 65)
  447, // Bgvur Tialbold (Billposter, Lv 70)
  8813, // Blood Fist (Billposter, Lv 70)
  3840, // Sonichand (Billposter, Lv 75)
  5041, // Asalraalaikum (Billposter, Lv 80)
  // Harlequin
  20592, // Harlequin's Greeting (Harlequin, Lv 166)
  43556, // Toxic Assault (Harlequin, Lv 170)
  47649, // Harlequin's Charge (Harlequin, Lv 170)
  21383, // Yo-Yo Storm (Harlequin, Lv 175)
  49981, // Toxic Cloud (Harlequin, Lv 175)
  7023, // Multi-Stab (Jester, Lv 60)
  7156, // Hit of Penya (Jester, Lv 75)
  5162, // Vital Stab (Jester, Lv 80)
  // Mentalist
  21660, // Cimetiere's Scream (Mentalist, Lv 166)
  27025, // Lillith's Gaze (Mentalist, Lv 166)
  46491, // Chimera's Curse (Mentalist, Lv 166)
  47120, // Hexe's Lament (Mentalist, Lv 166)
  30553, // Aether Rend (Mentalist, Lv 175)
  7175, // Psychic Bomb (Psykeeper, Lv 60)
  8191, // Demonology (Psykeeper, Lv 60)
  6026, // Maximum Crisis (Psykeeper, Lv 65)
  6206, // Spirit Bomb (Psykeeper, Lv 65)
  8356, // Psychic Square (Psykeeper, Lv 75)
  7483, // Gravity Well (Psykeeper, Lv 100)
  // Seraph
  32253, // Flow of Salvation (Seraph, Lv 170)
  30021, // Hammer of Judgement (Seraph, Lv 175)
  8275, // Merkaba Hanzelrusha (Ringmaster, Lv 60)
  // Slayer
  26859, // Stigma I (Slayer, Lv 166)
  32997, // Bloody Rush (Slayer, Lv 166)
  56049, // Storm Slash (Slayer, Lv 166)
  26308, // Cross of Blood (Slayer, Lv 170)
  34720, // Stigma II (Slayer, Lv 170)
  38885, // Storm Strike (Slayer, Lv 170)
  35947, // Tempest Barrage (Slayer, Lv 175)
  53032, // Bloody Thorn (Slayer, Lv 175)
  56413, // Stigma III (Slayer, Lv 175)
  3399, // Silent Strike (Blade, Lv 60)
  9538, // Spring Attack (Blade, Lv 60)
  9740, // Armor Penetrate (Blade, Lv 62)
  4311, // Blade Dance (Blade, Lv 65)
  7224, // Hawk Attack (Blade, Lv 65)
  51, // Sonic Blade (Blade, Lv 70)
  8348, // Cross Strike (Blade, Lv 75)
  5294, // Rending Entry (Blade, Lv 100)
  // Templar
  50505, // Shield Crush (Templar, Lv 166)
  57962, // Maelstrom Strike (Templar, Lv 166)
  57488, // Sky Splitter (Templar, Lv 170)
  59270, // Rush Attack (Templar, Lv 170)
  24229, // Execution of Justice (Templar, Lv 175)
  2564, // Pain Dealer (Knight, Lv 60)
  2911, // Charge (Knight, Lv 60)
  2869, // Earth Divider (Knight, Lv 65)
  6553, // Call of Fury (Knight, Lv 65)
  7208, // Grand Rage (Knight, Lv 65)
  8890, // Power Stomp (Knight, Lv 65)
  5559, // Power Swing (Knight, Lv 75)
];

/**
 * Hits per cast of multi-hit damage skills (the API carries no hit count). Only entries other
 * than 1; a master variation without an entry inherits its base's. Filled in from in-game
 * observation as the user reports them.
 */
export const DAMAGE_SKILL_HITS: Readonly<Record<number, number>> = {};

/** Damage skills with their own rules in the damage formula (flyffdamagecalculator.js). */
export const ASAL_SKILL_ID = 5041;
export const HIT_OF_PENYA_SKILL_ID = 7156;
export const ARMOR_PENETRATE_SKILL_ID = 9740;
export const SPIRIT_BOMB_SKILL_ID = 6206;

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
  magician: 9581,
  templar: 29955,
  slayer: 35369,
  seraph: 26141,
  harlequin: 49011,
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

/**
 * Skill-damage awakes ("Maximum Crisis +25 %") are stored under `skill:<skillId>`, a pseudo-stat
 * that only the damage of that skill (and its master variations) reads.
 */
export const SKILL_AWAKE_PREFIX = 'skill:';

export function skillAwakeParameter(skillId: number): string {
  return `${SKILL_AWAKE_PREFIX}${String(skillId)}`;
}

export function isSkillAwakeParameter(parameter: string): boolean {
  return parameter.startsWith(SKILL_AWAKE_PREFIX);
}

/** The awakened skill's id, or undefined for a stat awake such as `healing`. */
export function skillAwakeSkillId(parameter: string): number | undefined {
  return isSkillAwakeParameter(parameter)
    ? Number(parameter.slice(SKILL_AWAKE_PREFIX.length))
    : undefined;
}
