/**
 * Degradations the engine applied while resolving a gear swap. Resolution never throws on bad user
 * state: the offending piece is skipped and reported here so the UI can flag the swap.
 */

export type EngineIssueSeverity = 'error' | 'warning';

export const ENGINE_ISSUE_CODES = {
  /** A swap references an entry (stat page, weapon, …) that no longer exists. */
  missingEntry: 'missing-entry',
  /** An entry references an item/set id that is not in the bundled game data. */
  unknownItem: 'unknown-item',
  unknownNpc: 'unknown-npc',
  unknownAchievement: 'unknown-achievement',
  unknownBlessing: 'unknown-blessing',
  /** The stored offhand is incompatible with the job/mainhand and was dropped. */
  offhandIgnored: 'offhand-ignored',
  jewelsExceedSlots: 'jewels-exceed-slots',
  cardsExceedSlots: 'cards-exceed-slots',
  /** An ultimate random-stat line names a parameter the weapon cannot roll. */
  randomStatInvalid: 'random-stat-invalid',
  /** The chosen necklace variant does not exist for the accessory set (Peision on Adept's). */
  accessoryVariantUnavailable: 'accessory-variant-unavailable',
} as const;

export type EngineIssueCode = (typeof ENGINE_ISSUE_CODES)[keyof typeof ENGINE_ISSUE_CODES];

export interface EngineIssue {
  readonly severity: EngineIssueSeverity;
  readonly code: string;
  readonly message: string;
}

export function engineError(code: EngineIssueCode, message: string): EngineIssue {
  return { severity: 'error', code, message };
}

export function engineWarning(code: EngineIssueCode, message: string): EngineIssue {
  return { severity: 'warning', code, message };
}
