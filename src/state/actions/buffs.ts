import type { BuffsState } from '@/domain/build';

import type { ActionContext } from './shared';

export interface BuffActions {
  updateBuffs(recipe: (buffs: BuffsState) => void): void;
  toggleIdInList(
    list: keyof Pick<
      BuffsState,
      'premiumItemIds' | 'personalNpcIds' | 'coupleNpcIds' | 'guildNpcIds'
    >,
    id: number,
  ): void;
  toggleRmBuff(skillId: number): void;
}

function toggle(ids: number[], id: number): void {
  const index = ids.indexOf(id);

  if (index === -1) {
    ids.push(id);
  } else {
    ids.splice(index, 1);
  }
}

export function createBuffActions({ set }: ActionContext): BuffActions {
  return {
    updateBuffs(recipe) {
      set((draft) => {
        recipe(draft.build.buffs);
      });
    },

    toggleIdInList(list, id) {
      set((draft) => {
        toggle(draft.build.buffs[list], id);
      });
    },

    toggleRmBuff(skillId) {
      set((draft) => {
        toggle(draft.build.buffs.rmBuffs.excludedSkillIds, skillId);
      });
    },
  };
}
