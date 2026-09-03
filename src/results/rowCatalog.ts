import { getStatName, type GameData, type StatKey } from '@/data';

import {
  BLOCK_DEX_BONUS_MAX,
  BLOCK_EFFECTIVE_MAX,
  BLOCK_EFFECTIVE_MIN,
  type HealingSkills,
  type ResultsPage,
  type SwapResult,
} from '@/domain/engine';

import { formatInt, formatPercent } from './format';

/**
 * The rows of the results table (plan A4.2), grouped and ordered. Rows are pure selectors over a
 * {@link ResultsPage}; the table, the comparison helpers and the exporters all consume this one
 * catalogue so the row order and labels can never drift between them.
 */

export type RowFormat = 'int' | 'percent' | 'range';

export interface RangeValue {
  readonly min: number;
  readonly max: number;
}

/** A cell value; `null` when the row does not apply to the column (e.g. healing for non-Seraphs). */
export type RowValue = number | RangeValue | null;

export const RESULTS_GROUP_IDS = [
  'base',
  'vitals',
  'speed',
  'offense',
  'defense',
  'healing',
  'raw',
] as const;

export type ResultsGroupId = (typeof RESULTS_GROUP_IDS)[number];

export interface ResultsGroup {
  readonly id: ResultsGroupId;
  readonly label: string;
  /** Dim inline note shown after the group label. */
  readonly note?: string | undefined;
}

/** One line of a cell tooltip: a factor or a source and its formatted value. */
export interface CellDetail {
  readonly label: string;
  readonly value: string;
}

export type CellDetails = (page: ResultsPage) => readonly CellDetail[];

/** A stat total whose contributions explain a row; `statPageKey` adds the stat page line. */
export interface SourceSpec {
  readonly parameter: string;
  readonly rate: boolean;
  readonly statPageKey?: StatKey | undefined;
}

export interface ResultsRow {
  readonly id: string;
  readonly group: ResultsGroupId;
  readonly label: string;
  readonly format: RowFormat;
  readonly higherIsBetter: boolean;
  readonly tooltip?: string | undefined;
  /** Precomputed factors for the cell tooltip (max HP/MP/FP, the DEX term of block), shown first. */
  readonly details?: CellDetails | undefined;
  /** Stat totals whose contributions the cell tooltip lists as sources, after the factors. */
  readonly sources?: readonly SourceSpec[] | undefined;
  readonly select: (page: ResultsPage) => RowValue;
}

export interface ResultsRowGroup {
  readonly group: ResultsGroup;
  readonly rows: readonly ResultsRow[];
}

export interface RowCatalogOptions {
  readonly showRawTotals: boolean;
}

const HEAL_SYNERGY_NOTE = 'Gloria Patri rows include Heal synergy (Heal Lv 20, +1000)';
const HEAL_SYNERGY_TOOLTIP =
  'Includes the Heal synergy with Heal assumed maxed at Lv 20 (+1000 HP per cast).';

export const RESULTS_GROUPS: readonly ResultsGroup[] = [
  { id: 'base', label: 'Base stats' },
  { id: 'vitals', label: 'Vitals' },
  { id: 'speed', label: 'Speed' },
  { id: 'offense', label: 'Offense' },
  { id: 'defense', label: 'Defense' },
  { id: 'healing', label: 'Healing skills', note: HEAL_SYNERGY_NOTE },
  { id: 'raw', label: 'Raw totals' },
];

type NumericPageKey = {
  [K in keyof ResultsPage]: ResultsPage[K] extends number ? K : never;
}[keyof ResultsPage];

interface ScalarRowOptions {
  readonly lowerIsBetter?: boolean;
  readonly tooltip?: string;
  readonly details?: CellDetails;
  readonly sources?: readonly SourceSpec[];
}

function rateSource(parameter: string): readonly SourceSpec[] {
  return [{ parameter, rate: true }];
}

function baseStatSource(stat: StatKey): readonly SourceSpec[] {
  return [{ parameter: stat, rate: false, statPageKey: stat }];
}

/** The factors behind a max HP / MP / FP value (plan feedback 2026-09-02, results item 2). */
function vitalDetails(
  key: 'hpBreakdown' | 'mpBreakdown' | 'fpBreakdown',
  short: string,
  baseStat: string,
): CellDetails {
  return (page) => {
    const breakdown = page[key];

    return [
      { label: `Base (class, level, ${baseStat})`, value: formatInt(breakdown.base) },
      { label: `Flat ${short} bonus`, value: `+${formatInt(breakdown.flat)}` },
      { label: `${short} % bonus`, value: `+${formatPercent(breakdown.rate)}` },
      { label: `Gained from ${short} %`, value: `+${formatInt(breakdown.rateGain)}` },
    ];
  };
}

function scalarRow(
  group: ResultsGroupId,
  key: NumericPageKey,
  label: string,
  format: Exclude<RowFormat, 'range'>,
  options: ScalarRowOptions = {},
): ResultsRow {
  return {
    id: key,
    group,
    label,
    format,
    higherIsBetter: options.lowerIsBetter !== true,
    tooltip: options.tooltip,
    details: options.details,
    sources: options.sources,
    select: (page) => page[key],
  };
}

/** How a heal comes together (plan feedback 2026-09-03, item 4): formula, multiplier, gain. */
function healingDetails(key: keyof HealingSkills): CellDetails {
  return (page) => {
    let lines: CellDetail[] = [];

    if (page.healingSkills !== null) {
      const heal = page.healingSkills[key];
      const multiplier = 1 + heal.healingRate / 100;

      lines = [
        { label: 'Skill output', value: formatInt(heal.skillOutput) },
        { label: 'Healing % multiplier', value: `×${multiplier.toFixed(2)}` },
        { label: 'Gain from multiplier', value: `+${formatInt(heal.total - heal.skillOutput)}` },
      ];
    }

    return lines;
  };
}

function healingRow(
  key: keyof HealingSkills,
  label: string,
  tooltip: string | undefined,
): ResultsRow {
  return {
    id: key,
    group: 'healing',
    label,
    format: 'int',
    higherIsBetter: true,
    tooltip,
    details: healingDetails(key),
    select: (page) => (page.healingSkills === null ? null : page.healingSkills[key].total),
  };
}

const STATIC_ROWS: readonly ResultsRow[] = [
  scalarRow('base', 'str', 'STR', 'int', { sources: baseStatSource('str') }),
  scalarRow('base', 'sta', 'STA', 'int', { sources: baseStatSource('sta') }),
  scalarRow('base', 'dex', 'DEX', 'int', { sources: baseStatSource('dex') }),
  scalarRow('base', 'int', 'INT', 'int', { sources: baseStatSource('int') }),
  scalarRow('vitals', 'hp', 'Max HP', 'int', { details: vitalDetails('hpBreakdown', 'HP', 'STA') }),
  scalarRow('vitals', 'mp', 'Max MP', 'int', { details: vitalDetails('mpBreakdown', 'MP', 'INT') }),
  scalarRow('vitals', 'fp', 'Max FP', 'int', { details: vitalDetails('fpBreakdown', 'FP', 'STA') }),
  scalarRow('speed', 'movementSpeed', 'Movement speed %', 'percent', {
    sources: rateSource('speed'),
  }),
  scalarRow('speed', 'jumpHeight', 'Jump height %', 'percent', {
    sources: [{ parameter: 'jumpheight', rate: false }],
  }),
  scalarRow('speed', 'castingSpeed', 'Casting speed %', 'percent', {
    sources: rateSource('decreasedcastingtime'),
  }),
  scalarRow('speed', 'attackSpeed', 'Attack speed %', 'percent'),
  scalarRow('offense', 'attack', 'Attack', 'int'),
  scalarRow('offense', 'magicAttack', 'Magic Attack %', 'percent', {
    sources: rateSource('magicattack'),
  }),
  scalarRow('offense', 'skillDamage', 'Skill damage %', 'percent', {
    sources: rateSource('skilldamage'),
  }),
  scalarRow('offense', 'pveDamage', 'PvE damage %', 'percent', {
    sources: rateSource('pvedamage'),
  }),
  scalarRow('offense', 'pvpDamage', 'PvP damage %', 'percent', {
    sources: rateSource('pvpdamage'),
  }),
  scalarRow('offense', 'hitRate', 'Hit rate %', 'percent', {
    tooltip: 'Against a training dummy, clamped to 20–96%.',
  }),
  scalarRow('offense', 'criticalChance', 'Critical chance %', 'percent', {
    sources: rateSource('criticalchance'),
  }),
  scalarRow('offense', 'criticalDamage', 'Critical damage %', 'percent', {
    sources: rateSource('criticaldamage'),
  }),
  scalarRow('offense', 'blockPenetration', 'Block penetration %', 'percent', {
    sources: rateSource('blockpenetration'),
  }),
  scalarRow('offense', 'healing', 'Healing %', 'percent', { sources: rateSource('healing') }),
  {
    id: 'defense',
    group: 'defense',
    label: 'Defense',
    format: 'range',
    higherIsBetter: true,
    tooltip: 'The game rolls between min and max on every hit.',
    select: (page) => ({ min: page.defenseMin, max: page.defenseMax }),
  },
  scalarRow('defense', 'magicDefense', 'Magic defense', 'int'),
  scalarRow('defense', 'magicResistance', 'Magic resistance %', 'percent', {
    sources: rateSource('magicdefense'),
  }),
  scalarRow('defense', 'criticalResist', 'Critical resist %', 'percent', {
    sources: rateSource('criticalresist'),
  }),
  scalarRow('defense', 'incomingDamage', 'Incoming damage %', 'percent', {
    lowerIsBetter: true,
    tooltip: 'Lower is better.',
    sources: rateSource('incomingdamage'),
  }),
  scalarRow('defense', 'pveDamageReduction', 'PvE damage reduction %', 'percent', {
    sources: rateSource('pvedamagereduction'),
  }),
  scalarRow('defense', 'pvpDamageReduction', 'PvP damage reduction %', 'percent', {
    sources: rateSource('pvpdamagereduction'),
  }),
  scalarRow('defense', 'parry', 'Parry', 'int', { sources: rateSource('parry') }),
];

/**
 * Block is shown before the attacker is known (plan feedback 2026-09-03): the character's own
 * DEX term plus equipment and buffs, uncapped, so the user can apply the attacker-dependent parts
 * (DEX difference, block penetration, giant halving, the 6.25–92.5% clamp) themselves.
 */
const BLOCK_TOOLTIP =
  'Pure block, not the effective chance: your DEX (job factor) plus equipment and buffs, ' +
  'uncapped. The effective chance also adds the DEX difference against the attacker (at most ' +
  `+${BLOCK_DEX_BONUS_MAX}%), is cut by the attacker’s block penetration, is halved against ` +
  `giants, and is clamped to ${BLOCK_EFFECTIVE_MIN}–${BLOCK_EFFECTIVE_MAX}%.`;

/**
 * The DEX term, rounded down — the game floors the whole sum, and every gear or buff block value
 * is whole, so this is what DEX effectively contributes. The sources follow it in the tooltip.
 */
function blockDetails(key: 'meleeBlockBreakdown' | 'rangedBlockBreakdown'): CellDetails {
  return (page) => [
    { label: 'From DEX (job factor)', value: formatPercent(Math.floor(page[key].fromDex)) },
  ];
}

const MELEE_BLOCK_ROW = scalarRow('defense', 'meleeBlock', 'Melee block %', 'percent', {
  tooltip: BLOCK_TOOLTIP,
  details: blockDetails('meleeBlockBreakdown'),
  sources: rateSource('meleeblock'),
});

const RANGED_BLOCK_ROW = scalarRow('defense', 'rangedBlock', 'Ranged block %', 'percent', {
  tooltip: BLOCK_TOOLTIP,
  details: blockDetails('rangedBlockBreakdown'),
  sources: rateSource('rangedblock'),
});

/** One "Block %" row while melee and ranged block agree in every column. */
const BLOCK_ROW: ResultsRow = {
  ...MELEE_BLOCK_ROW,
  id: 'block',
  label: 'Block %',
};

function blockRows(pages: readonly ResultsPage[]): readonly ResultsRow[] {
  const sameEverywhere = pages.every((page) => page.meleeBlock === page.rangedBlock);

  return sameEverywhere ? [BLOCK_ROW] : [MELEE_BLOCK_ROW, RANGED_BLOCK_ROW];
}

const HEALING_ROWS: readonly ResultsRow[] = [
  healingRow('healRain', 'Heal Rain (Lv 10)', undefined),
  healingRow('gloriaPatri', 'Gloria Patri (Lv 5)', HEAL_SYNERGY_TOOLTIP),
  healingRow(
    'gloriaPatriEffectIncrease',
    'Gloria Patri – Effect Increase (Lv 5)',
    HEAL_SYNERGY_TOOLTIP,
  ),
];

/** Raw-total parameters where a smaller number is the better one. */
const LOWER_IS_BETTER_PARAMETERS: ReadonlySet<string> = new Set(['incomingdamage']);

function rawRow(data: GameData, parameter: string, rate: boolean): ResultsRow {
  const name = getStatName(data, parameter);

  return {
    id: `raw:${parameter}:${rate ? 'rate' : 'flat'}`,
    group: 'raw',
    label: rate ? `${name} %` : name,
    format: rate ? 'percent' : 'int',
    higherIsBetter: !LOWER_IS_BETTER_PARAMETERS.has(parameter),
    sources: [{ parameter, rate }],
    select: (page) => {
      const bucket = page.rawTotals[parameter];
      let value = 0;

      if (bucket !== undefined) {
        value = rate ? bucket.rate : bucket.flat;
      }

      return value;
    },
  };
}

/** One row per (parameter, flat | rate) with a non-zero total in any column, sorted by label. */
function rawRows(data: GameData, pages: readonly ResultsPage[]): ResultsRow[] {
  const flatParameters = new Set<string>();
  const rateParameters = new Set<string>();

  for (const page of pages) {
    for (const [parameter, bucket] of Object.entries(page.rawTotals)) {
      if (bucket.flat !== 0) {
        flatParameters.add(parameter);
      }

      if (bucket.rate !== 0) {
        rateParameters.add(parameter);
      }
    }
  }

  const rows = [
    ...[...flatParameters].map((parameter) => rawRow(data, parameter, false)),
    ...[...rateParameters].map((parameter) => rawRow(data, parameter, true)),
  ];

  return rows.sort((a, b) => a.label.localeCompare(b.label));
}

/** The concrete rows for the current columns: static groups, healing when any column has it, raw totals on request. */
export function buildRows(
  data: GameData,
  results: readonly Pick<SwapResult, 'page'>[],
  options: RowCatalogOptions,
): ResultsRow[] {
  const pages = results.map((result) => result.page);
  const rows = [...STATIC_ROWS, ...blockRows(pages)];

  if (pages.some((page) => page.healingSkills !== null)) {
    rows.push(...HEALING_ROWS);
  }

  if (options.showRawTotals) {
    rows.push(...rawRows(data, pages));
  }

  return rows;
}

/** Rows bucketed under their group in catalogue order; groups without rows are dropped. */
export function groupRows(rows: readonly ResultsRow[]): ResultsRowGroup[] {
  return RESULTS_GROUPS.map((group) => ({
    group,
    rows: rows.filter((row) => row.group === group.id),
  })).filter((bucket) => bucket.rows.length > 0);
}

export function groupLabel(groupId: ResultsGroupId): string {
  return RESULTS_GROUPS.find((group) => group.id === groupId)?.label ?? groupId;
}
