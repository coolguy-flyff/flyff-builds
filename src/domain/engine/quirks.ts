/**
 * Flyffulator behaviours the engine reproduces on purpose (plan B7.5). Each entry cites the line in
 * the Flyffulator sources (`src/flyff/*.js`, `src/components/calculations/calculations.jsx`) that
 * defines the behaviour, so a future refresh can re-check it. Code sites reference the ids in
 * comments as `FLYFFULATOR_QUIRKS.<id>`.
 */

export interface FlyffulatorQuirk {
  readonly description: string;
  readonly reference: string;
}

export const FLYFFULATOR_QUIRKS = {
  exactSkillAwakeMatch: {
    description:
      'Skill awakes match only their exact parameter and only as rates: a `block` awake counts ' +
      'for `block` but not for `meleeblock`/`rangedblock`.',
    reference: 'flyffentity.js:1217-1221',
  },
  statScaleIgnoresMaximum: {
    description:
      '`getStatScale` never caps the referenced stat: the guard reads `scale.max` (a typo for ' +
      '`scale.maximum`), so healing scaling is uncapped.',
    reference: 'flyffentity.js:1793',
  },
  defenseRateScalesMagicDefense: {
    description: 'The `def` rate multiplies magic defense as well as physical defense.',
    reference: 'flyffentity.js:903',
  },
  negativeRatesIgnored: {
    description:
      'Negative `attack`%, `attackspeedrate`% and `spiritstrike`% are ignored (`> 0` guards) ' +
      'while flat `maxhp`/`maxmp`/`maxfp` bonuses clamp at 0.',
    reference: 'flyffentity.js:696-737, 791, 816, 1051',
  },
  rawArmorSetUpgrade: {
    description:
      'The armor-set upgrade bonus row is looked up with the raw lowest piece upgrade, without ' +
      'the ultimate +10 offset the multiplier uses.',
    reference: 'flyffentity.js:1284-1298, 1887-1898',
  },
  jewelsSlicedByUpgrade: {
    description:
      'Only the first `upgradeLevel` ultimate jewels count. The engine caps at the item’s jewel ' +
      'slots, which is the same bound for every weapon the UI can build.',
    reference: 'flyffentity.js:1258',
  },
  criticalChanceNotFloored: {
    description:
      'Critical chance is floored before the rate bonus is added, so the displayed value keeps ' +
      'the bonus’ decimals.',
    reference: 'flyffentity.js:1608-1628',
  },
  jumpHeightNotRounded: {
    description: 'Jump height is `(jumpheight + 200) / 2` without rounding.',
    reference: 'calculations.jsx:289',
  },
  achievementRateDefaultsFlat: {
    description:
      'Achievement abilities without a `rate` are flat (`rate ?? false`); the data pipeline ' +
      'normalises this once so the engine treats achievements like every other source.',
    reference: 'flyffentity.js:1505',
  },
  defenseMaxIsTrueBound: {
    description:
      'Flyffulator samples equipment defense with `floor(random · (max − min))`, so its sampled ' +
      'maximum is `max − 1`; the engine shows the true upper bound.',
    reference: 'flyffentity.js:1599-1605',
  },
  statRangesPerRangedAbility: {
    description:
      'Stat ranges are indexed by ability position; because no item mixes ranged and flat ' +
      'abilities, storing one value per ranged ability is equivalent.',
    reference: 'flyffentity.js:1191',
  },
  buffScalingAtCap: {
    description:
      'Max RM buffs assume the caster’s INT reaches every scaling cap, i.e. ' +
      '`min(bufferInt · scale, maximum)` collapses to `maximum`.',
    reference: 'flyffentity.js:1397-1424',
  },
  buffSynergiesNeedSkillLevels: {
    description:
      'Buff synergies read the caster’s skill levels, which Flyffulator never sets for RM buffs; ' +
      'they contribute nothing and the engine skips them.',
    reference: 'flyffentity.js:1367-1384',
  },
} as const satisfies Record<string, FlyffulatorQuirk>;

export type FlyffulatorQuirkId = keyof typeof FLYFFULATOR_QUIRKS;
