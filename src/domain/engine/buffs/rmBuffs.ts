import { RM_BUFF_SKILL_IDS, requireSkill, type GameData } from '@/data';

import type { RmBuffs } from '../../build/schema';
import type { Contribution } from '../abilities/types';
import { maxedSkillContributions } from './maxedSkill';

/** Every RM buff not switched off individually, when the master switch is on. */
export function rmBuffContributions(data: GameData, rmBuffs: RmBuffs): Contribution[] {
  const contributions: Contribution[] = [];

  if (rmBuffs.enabled) {
    const excluded = new Set(rmBuffs.excludedSkillIds);

    for (const skillId of RM_BUFF_SKILL_IDS) {
      if (!excluded.has(skillId)) {
        contributions.push(...maxedSkillContributions(requireSkill(data, skillId), 'rmBuff'));
      }
    }
  }

  return contributions;
}
