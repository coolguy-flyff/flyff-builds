/**
 * PvP targets of the damage rows (plan §9): the six defender numbers the damage formulas read from
 * a player of the character's level, as the character window shows them. Built-in presets are
 * geared players at one role — the attacker can see the opponent's role but never their reduction
 * switch, and the switch follows the role. Custom targets (`PvpTargetSchema` in the build) carry
 * the same numbers with the user's own values. Every preset number is a placeholder until the user
 * corrects it from in-game figures (2026-09-05).
 */
export interface PvpTargetStats {
  /**
   * Defense as the damage formula reads it, before the game's PvP factor (the engine applies
   * it): the level/STA term plus a quarter of the armor defense — the character window shows the
   * same term plus the whole armor defense.
   */
  readonly defense: number;
  /** Character-window magic defense (already inflated by def % and magic resistance %). */
  readonly magicDefense: number;
  /** Magic resistance %: magic skills lose this share of their attack before the defense. */
  readonly magicResistance: number;
  /** Critical resist %: scales the attacker's crit chance down; never touches the damage. */
  readonly criticalResist: number;
  /** PvP damage reduction % (the game caps it at 50). */
  readonly pvpDamageReduction: number;
  /** Incoming damage %: negative reduces the damage taken (the game caps it at −50). */
  readonly incomingDamage: number;
}

export type PvpTargetStatKey = keyof PvpTargetStats;

export const PVP_TARGET_STAT_KEYS: readonly PvpTargetStatKey[] = [
  'defense',
  'magicDefense',
  'magicResistance',
  'criticalResist',
  'pvpDamageReduction',
  'incomingDamage',
];

export interface StatBounds {
  readonly min: number;
  readonly max: number;
}

/** What a target may hold: the game's caps where it has them, generous room elsewhere. */
export const PVP_TARGET_BOUNDS: Readonly<Record<PvpTargetStatKey, StatBounds>> = {
  defense: { min: 0, max: 99_999 },
  magicDefense: { min: 0, max: 99_999 },
  magicResistance: { min: 0, max: 100 },
  criticalResist: { min: 0, max: 100 },
  pvpDamageReduction: { min: 0, max: 50 },
  incomingDamage: { min: -50, max: 0 },
};

/** The six numbers of any target-shaped object, and nothing else. */
export function pvpTargetStatsOf(source: PvpTargetStats): PvpTargetStats {
  return {
    defense: source.defense,
    magicDefense: source.magicDefense,
    magicResistance: source.magicResistance,
    criticalResist: source.criticalResist,
    pvpDamageReduction: source.pvpDamageReduction,
    incomingDamage: source.incomingDamage,
  };
}

export interface PvpTargetPreset extends PvpTargetStats {
  readonly id: string;
  readonly name: string;
}

/** Guild Ship NPC buffs: Anura (PvP damage reduction), Nanco (crit resist), Aibao (magic resistance). */
const GUILD_NPC_BUFF = 3;
/** Obsidian PvP set at 3/4: 5 % + 5 % PvP damage reduction. */
const OBSIDIAN_SET_REDUCTION = 10;
/** Defender's accessory set at 5/5. */
const DEFENDERS_SET_CRIT_RESIST = 10;
const DEFENDERS_SET_MAGIC_RESISTANCE = 5;
/** Protect at max level with enough INT: 20 % def and 20 % magic resistance. */
const PROTECT_MAGIC_RESISTANCE = 20;
const RUNE = 10;
/** A shield's skill awake at the rare cap; a shield holds one line, assumed to be crit resist. */
const SHIELD_AWAKE_CRIT_RESIST = 15;
/** A Lusaka weapon at max roll. */
const LUSAKA_INCOMING_DAMAGE = -10;

const SINGLE_REDUCTION_CRIT_RESIST = DEFENDERS_SET_CRIT_RESIST + GUILD_NPC_BUFF;
const SINGLE_REDUCTION_MAGIC_RESISTANCE =
  PROTECT_MAGIC_RESISTANCE + DEFENDERS_SET_MAGIC_RESISTANCE + GUILD_NPC_BUFF;
const SINGLE_REDUCTION_PVP_REDUCTION = OBSIDIAN_SET_REDUCTION + GUILD_NPC_BUFF;

/**
 * Preset defenses are rounded from the level/STA term of a Lv 190 player plus a quarter of the
 * armor defense the character window adds in full (2026-09-20): Squishy from a Crackshooter with
 * STA 130 and 8000 armor defense (270 + 2000), Balanced from a Forcemaster with STA 250 and 13000
 * (412 + 3250), Tank from a Templar with full STA (393) and 20000 (624 + 5000).
 */
export const PVP_TARGET_PRESETS: readonly PvpTargetPreset[] = [
  {
    id: 'squishy',
    name: 'Squishy',
    defense: 2000,
    magicDefense: 1500,
    magicResistance: 0,
    criticalResist: 0,
    pvpDamageReduction: 0,
    incomingDamage: 0,
  },
  {
    // A single-reduction switch: Obsidian set, Defender's set, Protect and the Guild Ship NPCs.
    id: 'balanced',
    name: 'Balanced',
    defense: 4000,
    magicDefense: 3500,
    magicResistance: SINGLE_REDUCTION_MAGIC_RESISTANCE,
    criticalResist: SINGLE_REDUCTION_CRIT_RESIST,
    pvpDamageReduction: SINGLE_REDUCTION_PVP_REDUCTION,
    incomingDamage: 0,
  },
  {
    // A double-reduction switch: Balanced plus a max-roll Lusaka weapon, a crit resist shield
    // awake and the crit resist and magic resistance runes.
    id: 'tank',
    name: 'Tank',
    defense: 6000,
    magicDefense: 6000,
    magicResistance: SINGLE_REDUCTION_MAGIC_RESISTANCE + RUNE,
    criticalResist: SINGLE_REDUCTION_CRIT_RESIST + SHIELD_AWAKE_CRIT_RESIST + RUNE,
    pvpDamageReduction: SINGLE_REDUCTION_PVP_REDUCTION,
    incomingDamage: LUSAKA_INCOMING_DAMAGE,
  },
];
