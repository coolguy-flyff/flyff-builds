/**
 * Pure calculation engine (plan B7): resolves gear swaps into stat contributions and derives the
 * results rows with Flyffulator's formulas. No React, no state, no singletons — every function
 * takes the `GameData` it reads.
 */

export type {
  Contribution,
  ContributionDetail,
  ContributionMatch,
  ContributionOrigin,
  ContributionOriginKind,
} from './abilities/types';
export { CONTRIBUTION_DETAILS, CONTRIBUTION_ORIGIN_KINDS } from './abilities/types';
export { expandTargetStats } from './abilities/targetStats';
export { getBaseStat, getRawTotals, getStatTotal, type StatBucket } from './abilities/totals';
export { DEFAULT_WEAPON } from './defaultWeapon';
export {
  computeHealingSkills,
  computeSkillHealing,
  type HealingBreakdown,
  type HealingSkills,
} from './healing/healing';
export { maxedSkillContributions } from './buffs/maxedSkill';
export {
  ENGINE_ISSUE_CODES,
  type EngineIssue,
  type EngineIssueCode,
  type EngineIssueSeverity,
} from './issues';
export { DEFAULT_ENGINE_OPTIONS, type EngineOptions } from './options';
export { FLYFFULATOR_QUIRKS, type FlyffulatorQuirk, type FlyffulatorQuirkId } from './quirks';
export { resolveGearSwap } from './resolve';
// Per-entry resolvers: the gear editors' ability previews audit what one entry contributes.
export { resolveAccessorySetEntry, type AccessorySetResolution } from './gear/accessorySet';
export { resolveEquipmentSetEntry, type EquipmentSetResolution } from './gear/equipmentSet';
export { resolveFashionSetEntry } from './gear/fashionSet';
export { resolvePetEntry } from './gear/pet';
export { resolvePetGrace, type PetGraceApplied } from './gear/petGrace';
export { resolveShieldEntry, type ShieldResolution } from './gear/shield';
export { resolveWeaponEntry, type WeaponHand, type WeaponResolution } from './gear/weapon';
export { computeAllResults, type SwapResult } from './results';
export { computeResultsPage, type ResultsPage } from './stats/resultsPage';
export type { VitalBreakdown } from './stats/vitals';
export type { EquippedItem, ResolvedCharacter, ResolvedOffhand } from './types';
