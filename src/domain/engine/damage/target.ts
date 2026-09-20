import { PVP_TARGET_PRESETS, type PvpTargetPreset, type PvpTargetStats } from '@/config/pvpTargets';
import type { PvpTarget } from '@/domain/build/schema';

import { TRAINING_DUMMY } from '../stats/combat';
import type { DamageTarget, DamageTargetChoice } from './types';

/**
 * Targets of the damage rows (plan §1, §9): Flyffulator's Training Dummy at the character's level
 * for PvE; for PvP a player of the same level described by six character-window numbers — a
 * built-in preset or one of the build's custom targets.
 */

export const DUMMY_TARGET_ID = 'dummy';

/** PvP scales the defender's defense and the damage by this (flyffentity.js:887-888, DC:613). */
export const PVP_FACTOR = 0.6;

/** Terms of a monster's defense against basic attacks (flyffentity.js:851-857, job factor 1). */
const MONSTER_LEVEL_SCALE = 2 / 2.8;
const MONSTER_STA_SCALE = 0.5 / 2.8;
const MONSTER_STA_FACTOR = 0.75;
const MONSTER_BASE_DEFENSE_OFFSET = 4;
const MONSTER_EQUIPMENT_DIVISOR = 4;
/** A monster's item defense against skills: `floor(defense / 7 + 1)` (flyffentity.js:877). */
const MONSTER_SKILL_DEFENSE_DIVISOR = 7;

/**
 * The dummy is a hidden-level monster: its level is the attacker's and its item defense scales
 * with it (flyffentity.js:846-849, 870-871). The same rule defines it one level below.
 */
export function trainingDummyTarget(level: number): DamageTarget {
  const defense = (TRAINING_DUMMY.defense * level) / 100;
  const sta = TRAINING_DUMMY.sta;
  const basic =
    Math.floor(
      level * MONSTER_LEVEL_SCALE +
        (sta * MONSTER_STA_SCALE + (sta - 14)) * MONSTER_STA_FACTOR -
        MONSTER_BASE_DEFENSE_OFFSET,
    ) + Math.floor(defense / MONSTER_EQUIPMENT_DIVISOR);

  return {
    choice: { kind: 'dummy' },
    name: 'Training dummy',
    mode: 'pve',
    level,
    defense: {
      basic,
      meleeSkill: Math.floor(defense / MONSTER_SKILL_DEFENSE_DIVISOR + 1),
      // Monsters have no magic defense stat (flyffentity.js:837 with `getStat` = 0).
      magicSkill: 0,
    },
    magicResistance: 0,
    criticalResist: 0,
    damageReduction: 0,
    incomingDamage: 0,
    // The level is the character's own; it stays out of the stats so the Overcrit row (one level
    // below) does not look contradictory next to it.
    stats: [
      { label: 'Defense', value: Math.floor(defense), rate: false },
      { label: 'Magic defense', value: TRAINING_DUMMY.magicDefense, rate: false },
    ],
  };
}

export interface PlayerTargetSpec {
  readonly choice: DamageTargetChoice;
  readonly name: string;
  /** Character-window numbers; the PvP factor is applied here. */
  readonly stats: PvpTargetStats;
}

/**
 * A player of the character's level with the given window numbers (plan §9). The window's magic
 * defense already carries the magic resistance % boost, while the damage formula applies that %
 * as a cut on the magic attack and meets it with the base magic defense
 * (flyffdamagecalculator.js:897-899, flyffentity.js:826-835): the boost is taken back out here so
 * the resistance counts once.
 */
export function playerTarget(spec: PlayerTargetSpec, level: number): DamageTarget {
  const { stats } = spec;
  const defense = Math.floor(stats.defense * PVP_FACTOR);
  const baseMagicDefense = stats.magicDefense / (1 + stats.magicResistance / 100);
  const magicDefense = Math.floor(baseMagicDefense * PVP_FACTOR);

  return {
    choice: spec.choice,
    name: spec.name,
    mode: 'pvp',
    level,
    defense: { basic: defense, meleeSkill: defense, magicSkill: magicDefense },
    magicResistance: stats.magicResistance,
    criticalResist: stats.criticalResist,
    damageReduction: stats.pvpDamageReduction,
    incomingDamage: stats.incomingDamage,
    stats: [
      { label: 'Defense', value: stats.defense, rate: false },
      { label: 'Magic defense', value: stats.magicDefense, rate: false },
      { label: 'Magic resistance', value: stats.magicResistance, rate: true },
      { label: 'Crit resist', value: stats.criticalResist, rate: true },
      { label: 'PvP damage reduction', value: stats.pvpDamageReduction, rate: true },
      { label: 'Incoming damage', value: stats.incomingDamage, rate: true },
    ],
  };
}

export function presetTarget(preset: PvpTargetPreset, level: number): DamageTarget {
  return playerTarget(
    { choice: { kind: 'preset', id: preset.id }, name: preset.name, stats: preset },
    level,
  );
}

export function customTarget(target: PvpTarget, level: number): DamageTarget {
  return playerTarget(
    { choice: { kind: 'custom', id: target.id }, name: target.name, stats: target },
    level,
  );
}

/** Every target the results view can pick: the dummy, the presets, then the build's own targets. */
export function listDamageTargets(
  level: number,
  customTargets: readonly PvpTarget[] = [],
): DamageTarget[] {
  return [
    trainingDummyTarget(level),
    ...PVP_TARGET_PRESETS.map((preset) => presetTarget(preset, level)),
    ...customTargets.map((target) => customTarget(target, level)),
  ];
}

/** A stable string for a choice, for select values and React keys. */
export function damageTargetKey(choice: DamageTargetChoice): string {
  let key: string;

  switch (choice.kind) {
    case 'dummy':
      key = DUMMY_TARGET_ID;
      break;
    case 'preset':
      key = `preset:${choice.id}`;
      break;
    case 'custom':
      key = `custom:${String(choice.id)}`;
      break;
  }

  return key;
}

/** The target a choice names; a choice nothing answers to (see `DamageTargetChoice`) is the dummy. */
export function resolveDamageTarget(
  choice: DamageTargetChoice,
  level: number,
  customTargets: readonly PvpTarget[] = [],
): DamageTarget {
  let target: DamageTarget | undefined;

  switch (choice.kind) {
    case 'dummy':
      break;

    case 'preset': {
      const preset = PVP_TARGET_PRESETS.find((candidate) => candidate.id === choice.id);

      target = preset === undefined ? undefined : presetTarget(preset, level);
      break;
    }

    case 'custom': {
      const custom = customTargets.find((candidate) => candidate.id === choice.id);

      target = custom === undefined ? undefined : customTarget(custom, level);
      break;
    }
  }

  return target ?? trainingDummyTarget(level);
}

/**
 * The target the Overcrit row hits: a monster one level below the character, which widens the
 * crit range (flyffdamagecalculator.js:968-980). Players never out-level a PvP target.
 */
export function overcritTarget(target: DamageTarget): DamageTarget | null {
  return target.mode === 'pve' ? trainingDummyTarget(target.level - 1) : null;
}
