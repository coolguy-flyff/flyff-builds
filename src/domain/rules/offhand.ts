import { CLASS_IDS, isAnteriorJob, jobAtLevel, type GameData, type SlimItem } from '@/data';

export type OffhandKind = 'none' | 'shield' | 'weapon';

/** Blade descendants (Slayer) dual-wield; everyone else pairs a one-handed weapon with a shield. */
export function canDualWield(data: GameData, jobId: number): boolean {
  return isAnteriorJob(data, jobId, CLASS_IDS.blade);
}

/** What the offhand slot may hold for a job with the given mainhand (null = bare hands). */
export function offhandKind(data: GameData, jobId: number, mainhand: SlimItem | null): OffhandKind {
  let kind: OffhandKind = 'shield';

  if (mainhand?.twoHanded === true) {
    kind = 'none';
  } else if (canDualWield(data, jobId)) {
    kind = 'weapon';
  }

  return kind;
}

/**
 * {@link offhandKind} for a build's character, whose stored job is a third-job path: the job it
 * holds at its level decides (a Lv 100 Blade dual-wields, a Lv 50 Mercenary does not).
 */
export function characterOffhandKind(
  data: GameData,
  character: { readonly jobId: number; readonly level: number },
  mainhand: SlimItem | null,
): OffhandKind {
  return offhandKind(data, jobAtLevel(data, character.jobId, character.level).id, mainhand);
}

export function isOneHandedWeapon(item: SlimItem): boolean {
  return item.category === 'weapon' && item.twoHanded !== true;
}
