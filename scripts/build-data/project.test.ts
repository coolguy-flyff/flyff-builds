import { describe, expect, it } from 'vitest';

import { collectSkillChanceSkillIds, normalizeAbilities } from './project';
import type { RawItem } from './source';

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
