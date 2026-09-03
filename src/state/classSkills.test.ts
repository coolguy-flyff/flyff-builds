import { describe, expect, it } from 'vitest';

import { CLASS_IDS, defaultClassSkillIds, loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { createMemoryStorage } from '@/persistence';

import { createAppStore } from './store';

const data = loadBundledGameData();
const HEAVENS_STEP = 55834;
const HEAVENS_STEP_EFFECT_INCREASE = 23194;
const HYMN_DAMAGE_REDUCTION = 47719;
const HYMN_PERFECT_PERFORMANCE = 47486;

function setup() {
  return createAppStore(
    { data, storage: createMemoryStorage(), now: () => 1 },
    createDefaultBuild(data),
  );
}

describe('class skill actions', () => {
  it('toggles skills and lets one variation of a family replace another', () => {
    const store = setup();
    const { actions } = store.getState();
    const active = (): number[] => store.getState().build.buffs.classSkillIds;

    actions.toggleClassSkill(HEAVENS_STEP);
    expect(active()).toContain(HEAVENS_STEP);

    actions.toggleClassSkill(HEAVENS_STEP_EFFECT_INCREASE);
    expect(active()).toContain(HEAVENS_STEP_EFFECT_INCREASE);
    expect(active()).not.toContain(HEAVENS_STEP);

    actions.toggleClassSkill(HEAVENS_STEP_EFFECT_INCREASE);
    expect(active()).not.toContain(HEAVENS_STEP_EFFECT_INCREASE);
  });

  it('switches a whole group on or off, one variation per family', () => {
    const store = setup();
    const { actions } = store.getState();
    const active = (): number[] => store.getState().build.buffs.classSkillIds;

    actions.setClassSkills([HYMN_DAMAGE_REDUCTION, HYMN_PERFECT_PERFORMANCE], false);
    expect(active()).toEqual([]);

    actions.setClassSkills(
      [HEAVENS_STEP, HEAVENS_STEP_EFFECT_INCREASE, HYMN_DAMAGE_REDUCTION],
      true,
    );
    expect(active()).toEqual([HEAVENS_STEP, HYMN_DAMAGE_REDUCTION]);
  });

  it("resets to the new job's permanent passives on a job change", () => {
    const store = setup();
    const { actions } = store.getState();

    actions.toggleClassSkill(HEAVENS_STEP);
    actions.setJob(CLASS_IDS.templar);

    const active = store.getState().build.buffs.classSkillIds;

    expect(active).toEqual(defaultClassSkillIds(data, CLASS_IDS.templar));
    expect(active.length).toBeGreaterThan(0);
    expect(active).not.toContain(HEAVENS_STEP);
  });
});
