import { defaultClassSkillIds, getItem, isAnteriorJob, requireClass } from '@/data';
import { repairReferences, type BuildState } from '@/domain/build';
import { clamp } from '@/lib/math';

import type { ActionContext } from './shared';

export interface JobChangeSummary {
  readonly equipmentSets: number;
  readonly weapons: number;
  readonly shields: number;
}

export interface CharacterActions {
  setLevel(level: number): void;
  /** Counts what a job switch would remove, without changing anything. */
  previewJobChange(jobId: number): JobChangeSummary;
  /** Switches job, removing gear the new job cannot use (caller snapshots first). */
  setJob(jobId: number): JobChangeSummary;
}

function incompatibleGear(
  deps: ActionContext['deps'],
  build: BuildState,
  jobId: number,
): { equipmentSetIds: Set<number>; weaponIds: Set<number>; shieldIds: Set<number> } {
  const { data } = deps;
  const equipmentSetIds = new Set<number>();
  const weaponIds = new Set<number>();
  const shieldIds = new Set<number>();

  for (const entry of build.equipmentSets) {
    const set = entry.setId === null ? undefined : data.armorSets.get(entry.setId);

    if (set !== undefined && !isAnteriorJob(data, jobId, set.jobId)) {
      equipmentSetIds.add(entry.id);
    }
  }

  const usable = (itemId: number | null): boolean => {
    const item = itemId === null ? undefined : getItem(data, itemId);

    return item?.class === undefined || isAnteriorJob(data, jobId, item.class);
  };

  for (const entry of build.weapons) {
    if (!usable(entry.itemId)) {
      weaponIds.add(entry.id);
    }
  }

  for (const entry of build.shields) {
    if (!usable(entry.itemId)) {
      shieldIds.add(entry.id);
    }
  }

  return { equipmentSetIds, weaponIds, shieldIds };
}

export function createCharacterActions({ set, get, deps }: ActionContext): CharacterActions {
  return {
    setLevel(level) {
      set((draft) => {
        const job = requireClass(deps.data, draft.build.character.jobId);
        draft.build.character.level = clamp(Math.round(level), job.minLevel, job.maxLevel);
      });
    },

    previewJobChange(jobId) {
      const removed = incompatibleGear(deps, get().build, jobId);

      return {
        equipmentSets: removed.equipmentSetIds.size,
        weapons: removed.weaponIds.size,
        shields: removed.shieldIds.size,
      };
    },

    setJob(jobId) {
      const summary = this.previewJobChange(jobId);

      set((draft) => {
        const job = requireClass(deps.data, jobId);
        const removed = incompatibleGear(deps, draft.build, jobId);

        draft.build.character.jobId = jobId;
        draft.build.character.level = clamp(
          draft.build.character.level,
          job.minLevel,
          job.maxLevel,
        );
        draft.build.equipmentSets = draft.build.equipmentSets.filter(
          (entry) => !removed.equipmentSetIds.has(entry.id),
        );
        draft.build.weapons = draft.build.weapons.filter(
          (entry) => !removed.weaponIds.has(entry.id),
        );
        draft.build.shields = draft.build.shields.filter(
          (entry) => !removed.shieldIds.has(entry.id),
        );
        // Class skills belong to a job: start the new job from its permanent passives.
        draft.build.buffs.classSkillIds = defaultClassSkillIds(deps.data, jobId);
        draft.build = repairReferences(draft.build).build;
      });

      return summary;
    },
  };
}
