import type { DamageSkill } from '../../src/data/schema';

import {
  maxLevelOf,
  ProjectionError,
  projectSkill,
  requireRawSkill,
  stripUndefined,
  type SkillLookup,
} from './project';
import type { RawSkill } from './source';

/**
 * Damage skills (plan §3): the curated attack skills of every third-job chain, each with the
 * master variations its base lists. Only the base's `masterVariations` count — the raw data also
 * carries stale duplicates that merely `inheritSkill` a base, which the game ignores.
 */

export interface DamageSkillFamilySource {
  readonly base: RawSkill;
  readonly variations: readonly RawSkill[];
}

/** Weapon requirement that every weapon satisfies. */
const ANY_WEAPON = 'enchantedweapon';
const NO_ELEMENT = 'none';

function requireAttackSkill(raw: RawSkill, context: string): void {
  if (maxLevelOf(raw).minAttack === undefined) {
    throw new ProjectionError(`${context}: skill ${raw.id} "${raw.name.en}" has no attack values`);
  }
}

/** The curated bases in list order, each with its listed variations. */
export function selectDamageSkills(
  lookup: SkillLookup,
  ids: readonly number[],
): DamageSkillFamilySource[] {
  return ids.map((id) => {
    const base = requireRawSkill(lookup, id, 'Damage skills');

    requireAttackSkill(base, 'Damage skills');

    const variations = (base.masterVariations ?? []).map((variationId) => {
      const context = `Damage skill ${base.id} "${base.name.en}" variations`;
      const variation = requireRawSkill(lookup, variationId, context);

      if (variation.inheritSkill !== base.id) {
        throw new ProjectionError(
          `${context}: skill ${variation.id} "${variation.name.en}" does not inherit the base`,
        );
      }

      requireAttackSkill(variation, context);

      return variation;
    });

    return { base, variations };
  });
}

/** Product of the multipliers that always apply; conditional ones need a buff the app does not track. */
function unconditionalMultiplier(raw: RawSkill): number {
  let product = 1;

  for (const entry of maxLevelOf(raw).damageMultiplier ?? []) {
    if (entry.condition === undefined) {
      product *= entry.multiplier;
    }
  }

  return product;
}

function firstNumber(values: readonly (number | string)[] | undefined): number | undefined {
  return values?.find((value): value is number => typeof value === 'number');
}

export function projectDamageSkill(
  raw: RawSkill,
  base: RawSkill,
  lookup: SkillLookup,
  hits: Readonly<Record<number, number>>,
): DamageSkill {
  const max = maxLevelOf(raw);

  if (max.minAttack === undefined) {
    throw new ProjectionError(`Damage skill ${raw.id} "${raw.name.en}" has no attack values`);
  }

  if (raw.class === undefined) {
    throw new ProjectionError(`Damage skill ${raw.id} "${raw.name.en}" has no class`);
  }

  return stripUndefined({
    ...projectSkill(raw, lookup),
    classId: raw.class,
    level: raw.level ?? 0,
    magic: raw.magic ?? false,
    elementType: raw.elementType === NO_ELEMENT ? undefined : raw.elementType,
    weapon: raw.weapon === ANY_WEAPON ? undefined : raw.weapon,
    attack: { min: max.minAttack, max: max.maxAttack ?? max.minAttack },
    multiplier: unconditionalMultiplier(raw),
    arbitraryValue: firstNumber(max.arbitraryData),
    familyId: base.id,
    baseLevelCount: (base.levels ?? []).length,
    hits: hits[raw.id] ?? hits[base.id] ?? 1,
  });
}

/** Every curated base followed by its variations, in table order. */
export function projectDamageSkills(
  lookup: SkillLookup,
  ids: readonly number[],
  hits: Readonly<Record<number, number>>,
): DamageSkill[] {
  const projected: DamageSkill[] = [];

  for (const { base, variations } of selectDamageSkills(lookup, ids)) {
    projected.push(projectDamageSkill(base, base, lookup, hits));

    for (const variation of variations) {
      projected.push(projectDamageSkill(variation, base, lookup, hits));
    }
  }

  return projected;
}
