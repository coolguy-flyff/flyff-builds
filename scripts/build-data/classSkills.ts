import { RM_BUFF_CLASS_IDS } from '../../src/data/constants';
import type { ClassSkill, ClassSkillKind } from '../../src/data/schema';

import { maxLevelOf, normalizeAbilities, projectSkill, type SkillLookup } from './project';
import { getClassChain, getThirdJobIds } from './select';
import type { RawClass, RawSkill } from './source';

/**
 * Class skills (plan feedback 2026-09-03, item 1): the buffs, self-buffs and passives of every
 * third-job chain that grant stats. Attack skills and debuffs are left out, as are the Assist and
 * Ringmaster buffs the "Max RM buffs" card already applies for Seraphs and Forcemasters.
 */

/** The data encodes permanent passives as one-hour buffs; shorter passives are triggered effects. */
export const PERMANENT_DURATION_SECONDS = 3600;

/** Abilities that are status effects, heals or shields rather than stats. */
const NON_STAT_PARAMETERS: ReadonlySet<string> = new Set([
  'attribute',
  'attributeimmunity',
  'removealldebuff',
  'hp',
  'maxshield',
]);

function isAttackSkill(raw: RawSkill): boolean {
  return (raw.levels ?? []).some((level) => level.minAttack !== undefined);
}

function grantsStats(raw: RawSkill): boolean {
  return normalizeAbilities(maxLevelOf(raw).abilities).some(
    (ability) => !NON_STAT_PARAMETERS.has(ability.parameter),
  );
}

/** A non-attack, non-debuff skill with at least one stat ability at its maximum level. */
export function isClassSkillCandidate(raw: RawSkill): boolean {
  return (
    raw.debuff !== true && (raw.levels ?? []).length > 0 && !isAttackSkill(raw) && grantsStats(raw)
  );
}

export function classSkillKind(raw: RawSkill): ClassSkillKind {
  let kind: ClassSkillKind;

  if (raw.passive === true) {
    kind = 'passive';
  } else if (raw.target === 'currentplayer') {
    kind = 'selfBuff';
  } else {
    kind = 'classBuff';
  }

  return kind;
}

/** Everything that decides a skill's stat effect at max level; variations with equal text collapse. */
function effectSignature(raw: RawSkill): string {
  const max = maxLevelOf(raw);

  return JSON.stringify([
    normalizeAbilities(max.abilities),
    max.scalingParameters ?? [],
    max.synergies ?? [],
  ]);
}

function familyIdOf(raw: RawSkill): number {
  return raw.inheritSkill ?? raw.id;
}

/** Base skill first, then variations by id, so the base survives the effect de-duplication. */
function byBaseThenId(a: RawSkill, b: RawSkill): number {
  const aIsBase = a.inheritSkill === undefined ? 0 : 1;
  const bIsBase = b.inheritSkill === undefined ? 0 : 1;

  return aIsBase - bIsBase || a.id - b.id;
}

/** Within a family, keeps one skill per distinct stat effect (the base or the lowest id). */
function dedupeFamilies(candidates: readonly RawSkill[]): RawSkill[] {
  const families = new Map<number, RawSkill[]>();

  for (const raw of candidates) {
    const family = families.get(familyIdOf(raw)) ?? [];
    family.push(raw);
    families.set(familyIdOf(raw), family);
  }

  const kept: RawSkill[] = [];

  for (const family of families.values()) {
    const seen = new Set<string>();

    for (const raw of [...family].sort(byBaseThenId)) {
      const signature = effectSignature(raw);

      if (!seen.has(signature)) {
        seen.add(signature);
        kept.push(raw);
      }
    }
  }

  return kept.sort((a, b) => a.id - b.id);
}

/** The classes whose skills the class-skill card lists: every chain minus the RM buff classes. */
export function classSkillClassIds(classes: Readonly<Record<string, RawClass>>): Set<number> {
  const ids = new Set<number>();

  for (const jobId of getThirdJobIds(classes)) {
    for (const classId of getClassChain(classes, jobId)) {
      if (!RM_BUFF_CLASS_IDS.includes(classId)) {
        ids.add(classId);
      }
    }
  }

  return ids;
}

export function selectClassSkills(
  skills: Readonly<Record<string, RawSkill>>,
  classes: Readonly<Record<string, RawClass>>,
): RawSkill[] {
  const classIds = classSkillClassIds(classes);
  const candidates = Object.values(skills).filter(
    (raw) => raw.class !== undefined && classIds.has(raw.class) && isClassSkillCandidate(raw),
  );

  return dedupeFamilies(candidates);
}

export function projectClassSkill(raw: RawSkill, lookup: SkillLookup): ClassSkill {
  const duration = maxLevelOf(raw).duration;
  const kind = classSkillKind(raw);
  const skill: ClassSkill = {
    ...projectSkill(raw, lookup),
    classId: raw.class ?? 0,
    level: raw.level ?? 0,
    kind,
    familyId: familyIdOf(raw),
    permanent: kind === 'passive' && (duration ?? 0) >= PERMANENT_DURATION_SECONDS,
  };

  if (duration !== undefined) {
    skill.durationSeconds = duration;
  }

  return skill;
}
