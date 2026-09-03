/**
 * Switches for behaviour the engine adds on top of Flyffulator. Passed explicitly (no global state)
 * so the parity suite can compare against Flyffulator with the additions turned off.
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
}

export const DEFAULT_ENGINE_OPTIONS: EngineOptions = Object.freeze({
  applyHealSynergy: true,
  petGrace: false,
});
