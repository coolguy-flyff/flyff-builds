import { useMemo } from 'react';

import { jobAtLevel, type ArmorSet, type GameData, type SlimItem } from '@/data';
import { isArmorSetUsable, isItemUsable } from '@/domain/rules';
import { useAppStore, useGameData } from '@/state';

type GearByJob<T> = (data: GameData) => ReadonlyMap<number, readonly T[]>;
type Usable<T> = (data: GameData, jobId: number, level: number, gear: T) => boolean;

/**
 * The gear of the build's third-job path that the job at the character's level can wear: a
 * Lv 45 Assist on the Seraph path is offered Assist and Vagrant gear up to its level, not
 * Ringmaster or Seraph gear. A stored pick outside the list stays selected (the engine flags it).
 */
function useWearable<T>(byJob: GearByJob<T>, usable: Usable<T>): readonly T[] {
  const data = useGameData();
  const character = useAppStore((state) => state.build.character);

  return useMemo(() => {
    const job = jobAtLevel(data, character.jobId, character.level);
    const candidates = byJob(data).get(character.jobId) ?? [];

    return candidates.filter((gear) => usable(data, job.id, character.level, gear));
  }, [data, character, byJob, usable]);
}

const weaponsByJob: GearByJob<SlimItem> = (data) => data.weaponsByJob;
const shieldsByJob: GearByJob<SlimItem> = (data) => data.shieldsByJob;
const armorSetsByJob: GearByJob<ArmorSet> = (data) => data.armorSetsByJob;

export function useWearableWeapons(): readonly SlimItem[] {
  return useWearable(weaponsByJob, isItemUsable);
}

export function useWearableShields(): readonly SlimItem[] {
  return useWearable(shieldsByJob, isItemUsable);
}

export function useWearableArmorSets(): readonly ArmorSet[] {
  return useWearable(armorSetsByJob, isArmorSetUsable);
}
