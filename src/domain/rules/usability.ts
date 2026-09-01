import { isAnteriorJob, type GameData, type SlimItem } from '@/data';

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
