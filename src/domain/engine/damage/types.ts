import type { SkillMode } from '../skills/statScale';

/**
 * Damage rows (plan §1): per-hit numbers of basic attacks and curated skills against a small
 * named target, without simulating misses, blocks or parries.
 */

export type DamageMode = SkillMode;

export interface DamageRange {
  readonly min: number;
  readonly max: number;
}

/**
 * What the results view picks: the Training dummy, a built-in PvP preset or one of the build's
 * custom targets. A choice is view state and can outlive what it names (a deleted custom target,
 * another build loaded); the engine then falls back to the dummy.
 */
export type DamageTargetChoice =
  | { readonly kind: 'dummy' }
  | { readonly kind: 'preset'; readonly id: string }
  | { readonly kind: 'custom'; readonly id: number };

/** One line of the target's tooltip. */
export interface DamageTargetStat {
  readonly label: string;
  readonly value: number;
  readonly rate: boolean;
}

/** The defender as the damage formula sees it (flyffentity.js:824-910). */
export interface DamageTarget {
  readonly choice: DamageTargetChoice;
  readonly name: string;
  readonly mode: DamageMode;
  readonly level: number;
  /** Defense met by basic attacks, melee skills and magic skills, PvP factor included. */
  readonly defense: {
    readonly basic: number;
    readonly meleeSkill: number;
    readonly magicSkill: number;
  };
  /** Magic resistance %: magic skills lose this share of their attack before the defense. */
  readonly magicResistance: number;
  /** Critical resist %: scales the attacker's crit chance down (0 for monsters). */
  readonly criticalResist: number;
  /** PvE/PvP damage reduction % of a player target (0 for monsters). */
  readonly damageReduction: number;
  /** Incoming damage % of the target. */
  readonly incomingDamage: number;
  readonly stats: readonly DamageTargetStat[];
}

export interface BasicDamageBreakdown {
  /** Attack before the target's defense: hit × multiplier + flat bonuses. */
  readonly attack: DamageRange;
  readonly attackMultiplier: number;
  readonly defense: number;
  /** `max(0.1, 1 + crit damage % / 100)`. */
  readonly critBonus: number;
  /** PvP, left-hand and basic-attack factors, multiplied. */
  readonly factor: number;
  /** The attacker's own critical chance % (the Offense row). */
  readonly criticalChance: number;
  /** The target's critical resist %. */
  readonly criticalResist: number;
  /** The party skill's bonus % against a monster (Global Attack 40, Linked Attack 20; 0 in PvP). */
  readonly partyBonus: number;
}

export interface BasicDamage {
  /** Final damage of a normal hit. */
  readonly hit: DamageRange;
  readonly average: number;
  readonly crit: DamageRange;
  /** Crit against a monster one level below (the wider crit range); null in PvP. */
  readonly overcrit: DamageRange | null;
  /** Critical chance % against this target: the own chance × (1 − crit resist / 100). */
  readonly criticalChance: number;
  readonly breakdown: BasicDamageBreakdown;
}

export interface SkillDamageBreakdown {
  /** The skill formula's output before the roll. */
  readonly power: DamageRange;
  /** Attack before the target's defense. */
  readonly attack: DamageRange;
  readonly attackMultiplier: number;
  readonly defense: number;
  /** The skill's own multipliers, the skill-damage awake and the PvP factor, multiplied. */
  readonly factor: number;
  /** The skill-damage awake % on the held items for this skill family (0 without one). */
  readonly skillAwake: number;
  /** The party skill's bonus % against a monster (Global Attack 40, Linked Attack 20; 0 in PvP). */
  readonly partyBonus: number;
}

export interface SkillDamage {
  readonly range: DamageRange;
  readonly average: number;
  readonly hits: number;
  readonly breakdown: SkillDamageBreakdown;
}

export interface DamageResults {
  readonly target: DamageTarget;
  /** Null for the magician chain, which shows no basic attacks. */
  readonly basic: BasicDamage | null;
  /** The left-hand hit of a dual-wielder with a second weapon. */
  readonly leftHand: BasicDamage | null;
  /** Every usable curated skill (bases and variations) by id. */
  readonly skills: Readonly<Record<number, SkillDamage>>;
}
