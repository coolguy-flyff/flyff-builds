import { isAnteriorJob, type ClassSkill, type GameData, type SlimItem } from '@/data';

/** A class skill can only be learned from its required level on; below that it is locked. */
export function isClassSkillUnlocked(skill: ClassSkill, level: number): boolean {
  return skill.level <= level;
}

/** Level and class gating for equipment (flyffentity.js:642-656). */
export function isItemUsable(
  data: GameData,
  jobId: number,
  level: number,
  item: SlimItem,
): boolean {
  const levelOk = item.level <= level + 10;
  const classOk = item.class === undefined || isAnteriorJob(data, jobId, item.class);

  return levelOk && classOk;
}
