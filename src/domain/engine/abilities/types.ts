/**
 * A single stat line produced by one configured source (an item ability, a card stack, a buff, …).
 * Every gear swap resolves to a flat list of these; the results page only ever sums them.
 */

export const CONTRIBUTION_ORIGIN_KINDS = [
  'mainhand',
  'offhand',
  'helmet',
  'suit',
  'gauntlet',
  'boots',
  'ring1',
  'ring2',
  'earring1',
  'earring2',
  'necklace',
  'cloak',
  'mask',
  'fashion',
  'blessing',
  'setAwake',
  'armorSetUpgrade',
  'armorSetBonus',
  'accessorySetBonus',
  'premiumItem',
  'rmBuff',
  'classSkill',
  'pet',
  'petGrace',
  'housingNpc',
  'achievement',
] as const;

export type ContributionOriginKind = (typeof CONTRIBUTION_ORIGIN_KINDS)[number];

export const CONTRIBUTION_DETAILS = [
  'ability',
  'statRange',
  'randomStat',
  'skillAwake',
  'upgradeLevel',
  'piercing',
  'jewel',
  'statAwake',
] as const;

export type ContributionDetail = (typeof CONTRIBUTION_DETAILS)[number];

/**
 * `union` contributions take part in the target-stat unions of `getStat` (e.g. `allstats` counts
 * for `str`); `exact` ones only match their own parameter — Flyffulator's skill-awake rule
 * (flyffentity.js:1217-1221).
 */
export type ContributionMatch = 'union' | 'exact';

export interface ContributionOrigin {
  readonly kind: ContributionOriginKind;
  readonly detail?: ContributionDetail;
  /** Human-readable source, e.g. `Land Card (A) ×10` or `Etranar Set +10`. */
  readonly label: string;
  readonly itemId?: number;
  readonly skillId?: number;
}

export interface Contribution {
  readonly parameter: string;
  readonly add: number;
  readonly rate: boolean;
  readonly match: ContributionMatch;
  readonly origin: ContributionOrigin;
}
