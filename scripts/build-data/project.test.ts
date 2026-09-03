import { describe, expect, it } from 'vitest';

import {
  assertCappedScalings,
  collectSkillChanceSkillIds,
  normalizeAbilities,
  projectPet,
  projectSkill,
  type SkillLookup,
} from './project';
import type { RawItem, RawSkill } from './source';

const STUN = 7599;
const POISON = 6824;

describe('normalizeAbilities', () => {
  it('keys skill-chance abilities by skill and, when limited to one mode, by PvE / PvP', () => {
    expect(
      normalizeAbilities([
        {
          parameter: 'skillchance',
          skill: STUN,
          pve: true,
          pvp: false,
          add: 1,
          addMax: 3,
          rate: true,
        },
        {
          parameter: 'skillchance',
          skill: STUN,
          pve: false,
          pvp: true,
          add: 1,
          addMax: 3,
          rate: true,
        },
        {
          parameter: 'skillchance',
          skill: POISON,
          pve: true,
          pvp: true,
          add: 4,
          addMax: 9,
          rate: true,
        },
        { parameter: 'sta', add: 25, addMax: 30, rate: false },
        { parameter: 'cure' },
      ]),
    ).toEqual([
      { parameter: `skillchance:${STUN}:pve`, add: 1, addMax: 3, rate: true, skill: STUN },
      { parameter: `skillchance:${STUN}:pvp`, add: 1, addMax: 3, rate: true, skill: STUN },
      { parameter: `skillchance:${POISON}`, add: 4, addMax: 9, rate: true, skill: POISON },
      { parameter: 'sta', add: 25, addMax: 30, rate: false },
    ]);
  });
});

describe('collectSkillChanceSkillIds', () => {
  it('lists every skill referenced by a skill-chance ability once, ascending', () => {
    const item = (id: number, skills: readonly number[]): RawItem => ({
      id,
      name: { en: `Item ${id}` },
      icon: 'x.png',
      level: 150,
      category: 'weapon',
      rarity: 'unique',
      abilities: skills.map((skill) => ({ parameter: 'skillchance', skill, add: 1, rate: true })),
    });

    expect(
      collectSkillChanceSkillIds({
        '1': item(1, [STUN, STUN]),
        '2': item(2, [POISON]),
        '3': { ...item(3, []), abilities: [{ parameter: 'sta', add: 5 }] },
      }),
    ).toEqual([POISON, STUN]);
  });
});

const CATS_REFLEX = 3721;
const LIONS_GRACE = 2472;

function rawSkill(id: number, levels: RawSkill['levels']): RawSkill {
  return { id, name: { en: `Skill ${id}` }, icon: `${id}.png`, levels };
}

const skills: Record<number, RawSkill> = {
  [CATS_REFLEX]: rawSkill(
    CATS_REFLEX,
    Array.from({ length: 20 }, () => ({})),
  ),
  [LIONS_GRACE]: rawSkill(LIONS_GRACE, [
    { abilities: [{ parameter: 'maxhp', add: 4, rate: true }] },
    { abilities: [{ parameter: 'maxhp', add: 12, rate: true }] },
  ]),
};
const lookup: SkillLookup = (skillId) => skills[skillId];

describe('projectSkill', () => {
  it('records the level count of every synergy source', () => {
    const skill = projectSkill(
      rawSkill(1, [
        {
          abilities: [{ parameter: 'block', add: 10, rate: true }],
          synergies: [{ parameter: 'block', skill: CATS_REFLEX, minLevel: 15, scale: 2 }],
        },
      ]),
      lookup,
    );

    expect(skill.max.synergies).toEqual([
      expect.objectContaining({ skill: CATS_REFLEX, sourceLevelCount: 20, minLevel: 15 }),
    ]);
    expect(() =>
      projectSkill(
        rawSkill(2, [{ synergies: [{ parameter: 'block', skill: 999, minLevel: 1, scale: 1 }] }]),
        lookup,
      ),
    ).toThrow(/skill 999/);
  });

  it('rejects an uncapped caster-stat scaling on a stat the skill grants', () => {
    const capped = projectSkill(
      rawSkill(3, [
        {
          abilities: [{ parameter: 'str', add: 20 }],
          scalingParameters: [
            { parameter: 'str', stat: 'int', scale: 0.04, maximum: 20 },
            { parameter: 'duration', stat: 'int', scale: 2 },
          ],
        },
      ]),
      lookup,
    );
    const uncapped = projectSkill(
      rawSkill(4, [
        {
          abilities: [{ parameter: 'str', add: 20 }],
          scalingParameters: [{ parameter: 'str', stat: 'int', scale: 0.04 }],
        },
      ]),
      lookup,
    );

    expect(() => {
      assertCappedScalings(capped);
    }).not.toThrow();
    expect(() => {
      assertCappedScalings(uncapped);
    }).toThrow(/without a maximum/);
  });
});

describe('projectPet', () => {
  it('bundles the grace skill levels and timings from the top tier', () => {
    const pet = projectPet(
      {
        petItemId: 9941,
        parameter: 'sta',
        rate: false,
        values: [1, 2, 4, 7, 11, 15, 17, 24, 33],
        tiers: [
          { graceSkill: LIONS_GRACE, graceSkillLevel: 1, graceSkillDuration: 20 },
          {
            graceSkill: LIONS_GRACE,
            graceSkillLevel: 2,
            graceSkillCooldown: 120,
            graceSkillDuration: 20,
            graceSkillEnergyConsumption: 50,
          },
        ],
      },
      'Lion Cage',
      lookup,
    );

    expect(pet?.grace).toEqual({
      skillId: LIONS_GRACE,
      name: `Skill ${LIONS_GRACE}`,
      icon: `${LIONS_GRACE}.png`,
      durationSeconds: 20,
      cooldownSeconds: 120,
      energy: 50,
      levels: [
        [{ parameter: 'maxhp', add: 4, rate: true }],
        [{ parameter: 'maxhp', add: 12, rate: true }],
      ],
    });
    expect(projectPet({ petItemId: 1, parameter: 'sta', values: [1] }, 'x', lookup)?.grace).toBe(
      undefined,
    );
  });
});
