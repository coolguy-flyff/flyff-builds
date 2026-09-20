import type { PvpTargetStats } from '@/config/pvpTargets';
import { createPvpTarget, LIMITS, type PvpTarget } from '@/domain/build';
import { DUMMY_TARGET_CHOICE } from '@/domain/engine';

import { takeId, type ActionContext } from './shared';

/** The build's custom PvP targets (plan §9): created by duplicating any target, edited in place. */
export interface PvpTargetActions {
  /**
   * Adds a custom target with the given name and numbers and picks it for the damage rows, so
   * the copy the user just made is the one they are looking at. `undefined` when the build
   * already holds the maximum.
   */
  addPvpTarget(name: string, stats: PvpTargetStats): number | undefined;
  updatePvpTarget(id: number, patch: Partial<Omit<PvpTarget, 'id'>>): void;
  /** Removes a custom target; the damage rows fall back to the dummy when it was the picked one. */
  removePvpTarget(id: number): void;
}

export function createPvpTargetActions({ set, get }: ActionContext): PvpTargetActions {
  return {
    addPvpTarget(name, stats) {
      let created: number | undefined;

      if (get().build.pvpTargets.length < LIMITS.pvpTargets) {
        set((draft) => {
          const id = takeId(draft);

          draft.build.pvpTargets.push(createPvpTarget(id, name.slice(0, LIMITS.nameLength), stats));
          draft.ui.results.damageTarget = { kind: 'custom', id };
          created = id;
        });
      }

      return created;
    },

    updatePvpTarget(id, patch) {
      set((draft) => {
        const target = draft.build.pvpTargets.find((candidate) => candidate.id === id);

        if (target !== undefined) {
          Object.assign(target, patch);
        }
      });
    },

    removePvpTarget(id) {
      set((draft) => {
        const index = draft.build.pvpTargets.findIndex((candidate) => candidate.id === id);

        if (index === -1) {
          return;
        }

        draft.build.pvpTargets.splice(index, 1);

        const picked = draft.ui.results.damageTarget;

        if (picked.kind === 'custom' && picked.id === id) {
          draft.ui.results.damageTarget = DUMMY_TARGET_CHOICE;
        }
      });
    },
  };
}
