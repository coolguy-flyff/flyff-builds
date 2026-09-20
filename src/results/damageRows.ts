import type { DamageSkill, DamageSkillFamily, GameData } from '@/data';
import {
  PARTY_MEMBERS,
  skillDamageSignature,
  type BasicDamage,
  type DamageRange,
  type DamageResults,
  type ResultsPage,
  type SkillDamage,
} from '@/domain/engine';

import { formatInt, formatPercent, formatRange } from './format';
import type { CellDetail, ResultsRow, RowFormat, RowValue, RowVariants } from './rowCatalog';

/**
 * The Damage group (plan §5): basic attack, crit, overcrit, the crit chance against a PvP target,
 * left hand, and one row per curated skill family the columns have, with a variation select where
 * the family offers variations. Presence is decided here — a row appears when any column has a
 * value for it.
 */

export const DAMAGE_ROW_IDS = {
  basic: 'damage:basic',
  crit: 'damage:crit',
  overcrit: 'damage:overcrit',
  critChance: 'damage:critChance',
  leftHand: 'damage:leftHand',
} as const;

export function skillRowId(familyId: number): string {
  return `damage:skill:${familyId}`;
}

export function skillVariantKey(familyId: number): string {
  return String(familyId);
}

const BASIC_TOOLTIP =
  'Average of a normal hit after the target’s defense: the hit range × attack multipliers, ' +
  'minus the game’s defense correction, plus PvE/PvP damage %. Misses, blocks and parries are ' +
  'not weighed in. Muran’s Wrath counts (target at full HP).';
const CRIT_TOOLTIP =
  'A critical hit: 1.1–1.4 × (1 + critical damage %) of the hit after the defense. The range ' +
  'is the game’s own crit factor spread. Skills never crit.';
const OVERCRIT_TOOLTIP =
  'A critical hit on a monster below your level uses the wider 1.2–2.0 factor range — an ' +
  '"overcrit". Shown against the dummy one level below you; players never out-level a PvP target.';
const CRIT_CHANCE_TOOLTIP =
  'Your critical chance against this target: the Offense crit chance × (1 − the target’s crit ' +
  'resist %), the game’s multiplicative rule. Crit resist changes how often you crit, never what ' +
  'a crit does. Only basic attacks crit.';
const LEFT_HAND_TOOLTIP =
  'The offhand weapon’s hit on every second swing of a dual-wielder: 75 % plus left-hand ' +
  'damage %, after the same defense.';
const CRIT_FACTOR_RANGE = '1.1–1.4';
const OVERCRIT_FACTOR_RANGE = '1.2–2.0';

function formatFactor(value: number): string {
  return `×${value.toFixed(2)}`;
}

function roundedRange(range: DamageRange): string {
  return formatRange({ min: Math.floor(range.min), max: Math.ceil(range.max) });
}

/** The lines behind a hit cell; `factorRange` is the crit factor spread of a crit row. */
function basicDetails(basic: BasicDamage, factorRange: string | null): CellDetail[] {
  const lines: CellDetail[] = [
    { label: 'Hit before defense', value: formatRange(basic.breakdown.attack) },
    { label: 'Attack multiplier', value: formatFactor(basic.breakdown.attackMultiplier) },
    { label: 'Target defense', value: formatInt(basic.breakdown.defense) },
  ];

  if (factorRange !== null) {
    lines.push({ label: 'Crit factor', value: factorRange });
    lines.push({ label: 'Crit damage bonus', value: formatFactor(basic.breakdown.critBonus) });
  }

  if (basic.breakdown.partyBonus !== 0) {
    lines.push(partySkillLine(basic.breakdown.partyBonus));
  }

  if (basic.breakdown.factor !== 1) {
    lines.push({ label: 'PvP / hand factor', value: formatFactor(basic.breakdown.factor) });
  }

  return lines;
}

/** The party skill's share, with the party size it assumes. */
function partySkillLine(partyBonus: number): CellDetail {
  return {
    label: `Party skill (${String(PARTY_MEMBERS)} players)`,
    value: `+${formatPercent(partyBonus)}`,
  };
}

function critChanceDetails(basic: BasicDamage): CellDetail[] {
  return [
    { label: 'Crit chance', value: formatPercent(basic.breakdown.criticalChance) },
    { label: 'Target crit resist', value: formatPercent(basic.breakdown.criticalResist) },
  ];
}

function skillDetails(skill: SkillDamage): CellDetail[] {
  const lines: CellDetail[] = [
    { label: 'Skill power', value: roundedRange(skill.breakdown.power) },
    { label: 'Attack before defense', value: formatRange(skill.breakdown.attack) },
    { label: 'Attack multiplier', value: formatFactor(skill.breakdown.attackMultiplier) },
    { label: 'Target defense', value: formatInt(skill.breakdown.defense) },
  ];

  if (skill.breakdown.skillAwake !== 0) {
    lines.push({ label: 'Skill awake', value: `+${formatPercent(skill.breakdown.skillAwake)}` });
  }

  if (skill.breakdown.partyBonus !== 0) {
    lines.push(partySkillLine(skill.breakdown.partyBonus));
  }

  if (skill.breakdown.factor !== 1) {
    lines.push({ label: 'Skill / PvP factor', value: formatFactor(skill.breakdown.factor) });
  }

  if (skill.hits > 1) {
    lines.push({ label: 'Hits per cast', value: `×${String(skill.hits)}` });
  }

  return lines;
}

type BasicPick = (damage: DamageResults) => BasicDamage | null;

interface BasicRowSpec {
  readonly id: string;
  readonly label: string;
  readonly tooltip: string;
  readonly format: RowFormat;
  /** The hand the row reads, or null when the column has no value for the row. */
  readonly pick: BasicPick;
  readonly value: (basic: BasicDamage) => RowValue;
  readonly details: (basic: BasicDamage) => CellDetail[];
}

const BASIC_ROW_SPECS: readonly BasicRowSpec[] = [
  {
    id: DAMAGE_ROW_IDS.basic,
    label: 'Basic attack',
    tooltip: BASIC_TOOLTIP,
    format: 'int',
    pick: (damage) => damage.basic,
    value: (basic) => basic.average,
    details: (basic) => basicDetails(basic, null),
  },
  {
    id: DAMAGE_ROW_IDS.crit,
    label: 'Crit',
    tooltip: CRIT_TOOLTIP,
    format: 'range',
    pick: (damage) => damage.basic,
    value: (basic) => basic.crit,
    details: (basic) => basicDetails(basic, CRIT_FACTOR_RANGE),
  },
  {
    id: DAMAGE_ROW_IDS.overcrit,
    label: 'Overcrit',
    tooltip: OVERCRIT_TOOLTIP,
    format: 'range',
    pick: (damage) => (damage.basic?.overcrit === null ? null : damage.basic),
    value: (basic) => basic.overcrit,
    details: (basic) => basicDetails(basic, OVERCRIT_FACTOR_RANGE),
  },
  {
    id: DAMAGE_ROW_IDS.critChance,
    label: 'Effective crit chance',
    tooltip: CRIT_CHANCE_TOOLTIP,
    format: 'percent',
    // Against the dummy (no crit resist) the row would repeat the Offense crit chance.
    pick: (damage) => (damage.target.mode === 'pvp' ? damage.basic : null),
    value: (basic) => basic.criticalChance,
    details: critChanceDetails,
  },
  {
    id: DAMAGE_ROW_IDS.leftHand,
    label: 'Left hand',
    tooltip: LEFT_HAND_TOOLTIP,
    format: 'int',
    pick: (damage) => damage.leftHand,
    value: (basic) => basic.average,
    details: (basic) => basicDetails(basic, null),
  },
];

function basicRow(spec: BasicRowSpec): ResultsRow {
  return {
    id: spec.id,
    group: 'damage',
    label: spec.label,
    format: spec.format,
    higherIsBetter: true,
    tooltip: spec.tooltip,
    details: (page) => {
      const basic = spec.pick(page.damage);

      return basic === null ? [] : spec.details(basic);
    },
    select: (page) => {
      const basic = spec.pick(page.damage);

      return basic === null ? null : spec.value(basic);
    },
  };
}

function hasSkill(pages: readonly ResultsPage[], skillId: number): boolean {
  return pages.some((page) => page.damage.skills[skillId] !== undefined);
}

/**
 * The variations whose damage differs from the base's and from each other's; a variation that
 * only changes a debuff, a range or a cooldown would just repeat the base row.
 */
function distinctVariations(family: DamageSkillFamily): DamageSkill[] {
  const seen = new Set([skillDamageSignature(family.base)]);
  const distinct: DamageSkill[] = [];

  for (const variation of family.variations) {
    const signature = skillDamageSignature(variation);

    if (!seen.has(signature)) {
      seen.add(signature);
      distinct.push(variation);
    }
  }

  return distinct;
}

/** The family's member the row shows: the chosen (distinct) variation, else the base. */
function chosenSkill(family: DamageSkillFamily, chosenId: number | undefined): DamageSkill {
  return distinctVariations(family).find((variation) => variation.id === chosenId) ?? family.base;
}

function variantsOf(family: DamageSkillFamily, chosen: DamageSkill): RowVariants | undefined {
  const variations = distinctVariations(family);
  let variants: RowVariants | undefined;

  if (variations.length > 0) {
    variants = {
      key: skillVariantKey(family.base.id),
      value: String(chosen.id),
      ariaLabel: `${family.base.name} variation`,
      options: [family.base, ...variations].map((skill) => ({
        value: String(skill.id),
        label: skill.name,
      })),
      suffix: chosen.hits > 1 ? `×${String(chosen.hits)}` : undefined,
    };
  }

  return variants;
}

/** The skill rows share the Damage group's tooltip instead of repeating it on each row. */
function skillRow(family: DamageSkillFamily, chosen: DamageSkill): ResultsRow {
  const suffix = chosen.hits > 1 ? ` ×${String(chosen.hits)}` : '';

  return {
    id: skillRowId(family.base.id),
    group: 'damage',
    label: `${chosen.name}${suffix}`,
    format: 'int',
    higherIsBetter: true,
    details: (page) => {
      const skill = page.damage.skills[chosen.id];

      return skill === undefined ? [] : skillDetails(skill);
    },
    variants: variantsOf(family, chosen),
    select: (page) => page.damage.skills[chosen.id]?.average ?? null,
  };
}

/** The families with a usable member in any column, in table order — normally one job's. */
function familiesInPages(data: GameData, pages: readonly ResultsPage[]): DamageSkillFamily[] {
  const seen = new Set<number>();
  const families: DamageSkillFamily[] = [];

  for (const family of data.damageSkillFamilies) {
    const members = [family.base, ...family.variations];

    if (!seen.has(family.base.id) && members.some((skill) => hasSkill(pages, skill.id))) {
      seen.add(family.base.id);
      families.push(family);
    }
  }

  return families;
}

export function damageRows(
  data: GameData,
  pages: readonly ResultsPage[],
  skillVariations: Readonly<Record<number, number>>,
): ResultsRow[] {
  const rows = BASIC_ROW_SPECS.filter((spec) =>
    pages.some((page) => spec.pick(page.damage) !== null),
  ).map(basicRow);

  for (const family of familiesInPages(data, pages)) {
    rows.push(skillRow(family, chosenSkill(family, skillVariations[family.base.id])));
  }

  return rows;
}
