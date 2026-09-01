import { STAT_KEYS, type StatKey } from '@/data';
import { MIN_BASE_STAT } from '@/domain/build';
import { remainingStatPoints } from '@/domain/rules';

import type { ActionContext } from './shared';

export interface StatPageActions {
  /** Sets a stat, clamping so remaining points never go negative; returns the applied value. */
  setStat(pageId: number, stat: StatKey, value: number): number;
  /** Dumps every remaining point into the stat. */
  maxStat(pageId: number, stat: StatKey): void;
  resetStatPage(pageId: number): void;
}

export function createStatPageActions({ set }: ActionContext): StatPageActions {
  return {
    setStat(pageId, stat, value) {
      let applied = value;

      set((draft) => {
        const page = draft.build.statPages.find((candidate) => candidate.id === pageId);

        if (page === undefined) {
          return;
        }

        const remaining = remainingStatPoints(draft.build.character.level, page);
        const ceiling = page[stat] + Math.max(remaining, 0);
        applied = Math.min(Math.max(Math.round(value), MIN_BASE_STAT), ceiling);
        page[stat] = applied;
      });

      return applied;
    },

    maxStat(pageId, stat) {
      set((draft) => {
        const page = draft.build.statPages.find((candidate) => candidate.id === pageId);

        if (page === undefined) {
          return;
        }

        const remaining = remainingStatPoints(draft.build.character.level, page);

        if (remaining > 0) {
          page[stat] += remaining;
        }
      });
    },

    resetStatPage(pageId) {
      set((draft) => {
        const page = draft.build.statPages.find((candidate) => candidate.id === pageId);

        if (page === undefined) {
          return;
        }

        for (const key of STAT_KEYS) {
          page[key] = MIN_BASE_STAT;
        }
      });
    },
  };
}
