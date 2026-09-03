import { describe, expect, it } from 'vitest';

import { CLASS_IDS, classSkillsFor, defaultClassSkillIds, loadBundledGameData } from '@/data';

import { createDefaultBuild } from './defaults';
import { repairBuild } from './validate';

const data = loadBundledGameData();
const HEAVENS_STEP = 55834;
const HYMN_DAMAGE_REDUCTION = 47719;
const BERSERK = 4369;

describe('class skills per job', () => {
  it('lists every chain except the RM buff classes, first job first', () => {
    const seraph = classSkillsFor(data, CLASS_IDS.seraph);
    const templar = classSkillsFor(data, CLASS_IDS.templar);

    expect(seraph.every((skill) => skill.classId === CLASS_IDS.seraph)).toBe(true);
    expect(seraph.some((skill) => skill.id === HEAVENS_STEP)).toBe(true);
    expect(templar.map((skill) => skill.classId).indexOf(CLASS_IDS.templar)).toBeGreaterThan(0);
    expect(templar.some((skill) => skill.id === BERSERK)).toBe(false);
    expect(classSkillsFor(data, 424242)).toEqual([]);
  });

  it('starts a fresh build with the permanent passives only', () => {
    const build = createDefaultBuild(data);

    expect(build.buffs.classSkillIds).toEqual(defaultClassSkillIds(data, CLASS_IDS.seraph));
    expect(build.buffs.classSkillIds).toContain(HYMN_DAMAGE_REDUCTION);
    expect(build.buffs.classSkillIds).not.toContain(HEAVENS_STEP);
  });

  it("drops class skills of another job and unknown ids, keeping the job's own", () => {
    const build = createDefaultBuild(data);
    const { build: repaired, warnings } = repairBuild(data, {
      ...build,
      buffs: { ...build.buffs, classSkillIds: [HEAVENS_STEP, BERSERK, 424242, HEAVENS_STEP] },
    });

    expect(repaired.buffs.classSkillIds).toEqual([HEAVENS_STEP]);
    expect(warnings.map((warning) => warning.code)).toEqual(['unknown-id', 'unknown-id']);
  });
});
