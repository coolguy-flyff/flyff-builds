import type { BuffsState } from '@/domain/build';

import type { ActionContext } from './shared';

/** The buff lists that are plain sets of ids. */
export type BuffIdListKey = keyof Pick<
  BuffsState,
  'premiumItemIds' | 'personalNpcIds' | 'coupleNpcIds' | 'guildNpcIds' | 'coupleSkillIds'
>;

export interface BuffActions {
  updateBuffs(recipe: (buffs: BuffsState) => void): void;
  toggleIdInList(list: BuffIdListKey, id: number): void;
  /** Switches several ids of a list at once; switched-on ids keep the given order. */
  setIdsInList(list: BuffIdListKey, ids: readonly number[], active: boolean): void;
  toggleRmBuff(skillId: number): void;
  /** Switches a class skill; switching one on drops the other variations of its family. */
  toggleClassSkill(skillId: number): void;
  /** Switches several class skills at once (the "all" / "none" links of a group). */
  setClassSkills(skillIds: readonly number[], active: boolean): void;
}

function toggle(ids: number[], id: number): void {
  const index = ids.indexOf(id);

  if (index === -1) {
    ids.push(id);
  } else {
    ids.splice(index, 1);
  }
}

function without(ids: readonly number[], drop: ReadonlySet<number>): number[] {
  return ids.filter((id) => !drop.has(id));
}

export function createBuffActions({ set, deps }: ActionContext): BuffActions {
  const familyOf = (skillId: number): number =>
    deps.data.classSkills.get(skillId)?.familyId ?? skillId;

  const siblingsOf = (skillId: number): Set<number> => {
    const family = familyOf(skillId);
    const siblings = new Set<number>();

    for (const skill of deps.data.classSkills.values()) {
      if (skill.familyId === family && skill.id !== skillId) {
        siblings.add(skill.id);
      }
    }

    return siblings;
  };

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

    setIdsInList(list, ids, active) {
      set((draft) => {
        const current = draft.build.buffs[list];

        if (active) {
          const missing = new Set(ids.filter((id) => !current.includes(id)));

          draft.build.buffs[list] = [...current, ...missing];
        } else {
          draft.build.buffs[list] = without(current, new Set(ids));
        }
      });
    },

    toggleRmBuff(skillId) {
      set((draft) => {
        toggle(draft.build.buffs.rmBuffs.excludedSkillIds, skillId);
      });
    },

    toggleClassSkill(skillId) {
      set((draft) => {
        const buffs = draft.build.buffs;

        if (buffs.classSkillIds.includes(skillId)) {
          buffs.classSkillIds = buffs.classSkillIds.filter((id) => id !== skillId);
        } else {
          buffs.classSkillIds = [...without(buffs.classSkillIds, siblingsOf(skillId)), skillId];
        }
      });
    },

    setClassSkills(skillIds, active) {
      set((draft) => {
        const buffs = draft.build.buffs;
        let next = without(buffs.classSkillIds, new Set(skillIds));

        if (active) {
          // Switching a whole group on keeps one variation per family: the first listed wins.
          const seenFamilies = new Set<number>();

          for (const skillId of skillIds) {
            const family = familyOf(skillId);

            if (!seenFamilies.has(family)) {
              seenFamilies.add(family);
              next = [...without(next, siblingsOf(skillId)), skillId];
            }
          }
        }

        buffs.classSkillIds = next;
      });
    },
  };
}
