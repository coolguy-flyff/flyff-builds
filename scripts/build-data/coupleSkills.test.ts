import { describe, expect, it } from 'vitest';

import { projectCoupleSkills } from './coupleSkills';
import type { RawSkill } from './source';

function rawSkill(id: number, name: string, abilities: RawSkill['levels']): RawSkill {
  return { id, name: { en: name }, icon: `${name}.png`, levels: abilities };
}

const SKILLS: Readonly<Record<number, RawSkill>> = {
  11: rawSkill(11, 'Stamina Boost', [
    { duration: 600, abilities: [{ parameter: 'allstats', add: 5, rate: false }] },
  ]),
  22: rawSkill(22, 'Madrigal Stroll', [
    { duration: 600, abilities: [{ parameter: 'speed', add: 5, rate: true }] },
  ]),
  33: rawSkill(33, 'Empty', [{ duration: 600, abilities: [] }]),
};

const lookup = (skillId: number): RawSkill | undefined => SKILLS[skillId];

describe('projectCoupleSkills', () => {
  it('pairs each listed skill with its couple level, lowest level first', () => {
    const skills = projectCoupleSkills(
      {
        skills: [
          { skill: 11, requiredCoupleLevel: 13 },
          { skill: 22, requiredCoupleLevel: 11 },
        ],
      },
      lookup,
    );

    expect(skills).toEqual([
      {
        id: 22,
        name: 'Madrigal Stroll',
        icon: 'Madrigal Stroll.png',
        coupleLevel: 11,
        durationSeconds: 600,
        abilities: [{ parameter: 'speed', add: 5, rate: true }],
      },
      {
        id: 11,
        name: 'Stamina Boost',
        icon: 'Stamina Boost.png',
        coupleLevel: 13,
        durationSeconds: 600,
        abilities: [{ parameter: 'allstats', add: 5, rate: false }],
      },
    ]);
  });

  it('fails on a listed skill that is missing or grants nothing', () => {
    expect(() =>
      projectCoupleSkills({ skills: [{ skill: 99, requiredCoupleLevel: 1 }] }, lookup),
    ).toThrow(/missing/);
    expect(() =>
      projectCoupleSkills({ skills: [{ skill: 33, requiredCoupleLevel: 1 }] }, lookup),
    ).toThrow(/no abilities/);
  });
});
