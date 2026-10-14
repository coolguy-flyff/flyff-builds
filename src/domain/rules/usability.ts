import { isAnteriorJob, type ArmorSet, type GameData, type SlimItem, type SlimSkill } from '@/data';

/** A skill can only be learned from its required level on; below that it is locked. */
export function isSkillUnlocked(skill: Pick<SlimSkill, 'level'>, level: number): boolean {
  return skill.level <= level;
}

/**
 * Whether a character holding `jobId` (the job at its level, not the third-job path) has the
 * skill: a class of its chain teaches it — or no class does — and the level is reached.
 */
export function isSkillLearnable(
  data: GameData,
  jobId: number,
  level: number,
  skill: Pick<SlimSkill, 'classId' | 'level'>,
): boolean {
  const classOk = skill.classId === undefined || isAnteriorJob(data, jobId, skill.classId);

  return classOk && isSkillUnlocked(skill, level);
}

/** Equipment allows wearing gear up to 10 levels above the character (flyffentity.js:647). */
function meetsGearLevel(requiredLevel: number, level: number): boolean {
  return requiredLevel <= level + 10;
}

/** Level and class gating for equipment (flyffentity.js:642-656). */
export function isItemUsable(
  data: GameData,
  jobId: number,
  level: number,
  item: SlimItem,
): boolean {
  const classOk = item.class === undefined || isAnteriorJob(data, jobId, item.class);

  return classOk && meetsGearLevel(item.level, level);
}

/** {@link isItemUsable} for a 4-piece armor set, which belongs to one job and level. */
export function isArmorSetUsable(
  data: GameData,
  jobId: number,
  level: number,
  set: ArmorSet,
): boolean {
  return isAnteriorJob(data, jobId, set.jobId) && meetsGearLevel(set.level, level);
}
