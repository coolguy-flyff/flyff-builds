import type { PvpTarget } from '@/domain/build/schema';

import type { DamageTargetChoice } from './damage/types';

/**
 * Switches for behaviour the engine adds on top of Flyffulator, and the results-only what-ifs.
 * Passed explicitly (no global state) so the parity suite can compare against Flyffulator with
 * the additions turned off.
 */
export interface EngineOptions {
  /**
   * Apply the Gloria Patri ↔ Heal synergy with Heal assumed maxed (plan B7.3). Flyffulator leaves
   * this synergy as a TODO (flyffdamagecalculator.js:56).
   */
  readonly applyHealSynergy: boolean;
  /**
   * Apply each swap's pet grace buff (plan feedback 2026-09-03, item 3) — a short, on-demand buff
   * the results view toggles rather than a standing part of the build.
   */
  readonly petGrace: boolean;
  /** The target of the damage rows. */
  readonly target: DamageTargetChoice;
  /** The build's custom PvP targets, which a `custom` choice names. */
  readonly customTargets: readonly PvpTarget[];
  /**
   * The target's health when hit, as Flyffulator's `targetHealthPercent`: Muran's Wrath applies
   * at 100 only. The parity suite lowers it to compare without that buff.
   */
  readonly targetHealthPercent: number;
  /**
   * The party's attack skill against monsters, with a full party of 8 assumed: Global Attack
   * (the leader's, 5 % per member) or Linked Attack (2.5 % per member). Ignored in PvP.
   */
  readonly partySkill: PartySkill;
}

export type PartySkill = 'none' | 'linked' | 'global';

export const DUMMY_TARGET_CHOICE: DamageTargetChoice = Object.freeze({ kind: 'dummy' });

export const DEFAULT_ENGINE_OPTIONS: EngineOptions = Object.freeze({
  applyHealSynergy: true,
  petGrace: false,
  target: DUMMY_TARGET_CHOICE,
  customTargets: [],
  targetHealthPercent: 100,
  partySkill: 'none',
});
