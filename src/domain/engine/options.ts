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
}

export const DEFAULT_ENGINE_OPTIONS: EngineOptions = Object.freeze({ applyHealSynergy: true });
