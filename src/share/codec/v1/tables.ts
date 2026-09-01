import { invariant } from '@/lib/assert';

/**
 * Frozen enumeration tables and constants of share-codec v1.
 *
 * NEVER reorder, remove or renumber entries of a released table: the numbers are baked into every
 * link ever shared (see LAYOUT.md). New entries may only be appended. A parameter missing from
 * {@link PARAM_TABLE_V1} still travels, as an inline string behind the {@link PARAM_ESCAPE} code.
 */

/**
 * Every parameter that can appear in an ultimate random-stat line, a fashion blessing or a skill
 * awake, seeded from the game data of 2026-09 (deduplicated and sorted once, then frozen).
 */
export const PARAM_TABLE_V1: readonly string[] = Object.freeze([
  'actionspeed', // 0
  'allelementsmastery',
  'attack',
  'attackspeed',
  'bleedandpoisonresist',
  'block', // 5
  'blockpenetration',
  'criticalchance',
  'criticaldamage',
  'criticalresist',
  'decreasedcastingtime', // 10
  'def',
  'dex',
  'earthdefense',
  'electricitydefense',
  'firedefense', // 15
  'healing',
  'int',
  'magicdefense',
  'maxfp',
  'maxhp', // 20
  'maxmp',
  'meleeblock',
  'parry',
  'pvedamage',
  'pveincomingdamage', // 25
  'pvpdamage',
  'rangedblock',
  'reflectdamage',
  'speed',
  'sta', // 30
  'stealhp',
  'str',
  'waterdefense',
  'winddefense',
]);

/** Parameter code that introduces an inline `str` for parameters outside the table. */
export const PARAM_ESCAPE = 0xfe;
/** Parameter code meaning "none" where a parameter is optional. */
export const PARAM_NONE = 0xff;

invariant(PARAM_TABLE_V1.length < PARAM_ESCAPE, 'PARAM_TABLE_V1 collides with the escape codes');

/** Value granularity of ultimate random-stat lines (itemedit.jsx:12-19); unlisted parameters use 1. */
export const STEP_V1: Readonly<Record<string, number>> = Object.freeze({
  attack: 0.1,
  criticaldamage: 0.1,
  criticalchance: 0.1,
  stealhp: 0.1,
  blockpenetration: 0.1,
  attackspeed: 0.05,
});
export const DEFAULT_STEP_V1 = 1;

export function randomStatStepV1(parameter: string): number {
  return STEP_V1[parameter] ?? DEFAULT_STEP_V1;
}

/** Weapon stat-range values use a fixed step so decoding never depends on the item data. */
export const RANGE_STEP_V1 = 0.01;
/** Blessing totals: halves are the finest blessing value; a fixed step keeps data out of decoding. */
export const BLESSING_STEP_V1 = 0.01;
/** Skill-awake values are whole percentages today; 0.1 leaves headroom. */
export const SKILL_AWAKE_STEP_V1 = 0.1;

/** Stat pages store `stat − 15`; 15 is the minimum base stat. */
export const BASE_STAT_OFFSET_V1 = 15;

export const STAT_KEYS_V1 = Object.freeze(['str', 'sta', 'dex', 'int'] as const);
export const EARRING_VARIANTS_V1 = Object.freeze(['plug', 'demol'] as const);
export const NECKLACE_VARIANTS_V1 = Object.freeze(['gore', 'mental', 'peision'] as const);
export const OFFHAND_KINDS_V1 = Object.freeze(['none', 'shield', 'weapon'] as const);
export const ACCESSORY_PIECES_V1 = Object.freeze([
  'ring1',
  'ring2',
  'earring1',
  'earring2',
  'necklace',
] as const);

/** Accessory `variants` byte: bit 0 earring 1, bit 1 earring 2, bits 2–3 necklace, bits 4–7 reserved. */
export const VARIANT_EARRING1_SHIFT = 0;
export const VARIANT_EARRING2_SHIFT = 1;
export const VARIANT_EARRING_MASK = 0b1;
export const VARIANT_NECKLACE_SHIFT = 2;
export const VARIANT_NECKLACE_MASK = 0b11;
export const VARIANT_KNOWN_BITS = 0b1111;
