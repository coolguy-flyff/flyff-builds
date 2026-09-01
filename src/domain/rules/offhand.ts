import { CLASS_IDS, isAnteriorJob, type GameData, type SlimItem } from '@/data';

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

export function isOneHandedWeapon(item: SlimItem): boolean {
  return item.category === 'weapon' && item.twoHanded !== true;
}
