import { describe, expect, it } from 'vitest';

import { projectDamageSkill, projectDamageSkills, selectDamageSkills } from './damageSkills';
import type { RawSkill } from './source';

const BLADE = 2246;
const BASE = 100;
const LISTED_VARIATION = 101;
const STRAY_VARIATION = 102;
const MULTIPLIED_VARIATION = 103;

function rawSkill(overrides: Partial<RawSkill> & Pick<RawSkill, 'id'>): RawSkill {
  return {
    name: { en: `Skill ${overrides.id}` },
    icon: 'x.png',
    class: BLADE,
    level: 70,
    weapon: 'sword',
    elementType: 'none',
    levels: [
      { minAttack: 10, maxAttack: 11 },
      { minAttack: 20, maxAttack: 21, scalingParameters: [] },
    ],
    ...overrides,
  };
}

const BASE_SKILL = rawSkill({
  id: BASE,
  masterVariations: [LISTED_VARIATION, MULTIPLIED_VARIATION],
});
const LISTED_SKILL = rawSkill({ id: LISTED_VARIATION, inheritSkill: BASE });
const MULTIPLIED_SKILL = rawSkill({
  id: MULTIPLIED_VARIATION,
  inheritSkill: BASE,
  magic: true,
  elementType: 'fire',
  weapon: 'enchantedweapon',
  levels: [
    { minAttack: 10 },
    {
      minAttack: 30,
      maxAttack: 31,
      damageMultiplier: [
        { multiplier: 1.3 },
        { multiplier: 2, condition: { requiredBuff: 1, onTarget: true } },
        { multiplier: 0.5 },
      ],
      arbitraryData: ['XI_MARKER', 50],
    },
  ],
});
const CLASSLESS_SKILL = rawSkill({ id: 203, class: undefined });

const skills: Record<number, RawSkill> = {
  [BASE]: BASE_SKILL,
  [LISTED_VARIATION]: LISTED_SKILL,
  [STRAY_VARIATION]: rawSkill({ id: STRAY_VARIATION, inheritSkill: BASE }),
  [MULTIPLIED_VARIATION]: MULTIPLIED_SKILL,
  200: rawSkill({ id: 200, levels: [{ abilities: [] }] }),
  201: rawSkill({ id: 201, masterVariations: [204] }),
  202: rawSkill({ id: 202, masterVariations: [LISTED_VARIATION] }),
  203: CLASSLESS_SKILL,
  204: rawSkill({ id: 204, inheritSkill: 201, levels: [{ abilities: [] }] }),
};

const lookup = (skillId: number): RawSkill | undefined => skills[skillId];

describe('selectDamageSkills', () => {
  it('expands each base through its listed variations only', () => {
    const [family] = selectDamageSkills(lookup, [BASE]);

    expect(family?.base.id).toBe(BASE);
    expect(family?.variations.map((skill) => skill.id)).toEqual([
      LISTED_VARIATION,
      MULTIPLIED_VARIATION,
    ]);
  });

  it('rejects missing skills, skills without attack values and stray variations', () => {
    expect(() => selectDamageSkills(lookup, [999])).toThrow('skill 999 is missing');
    expect(() => selectDamageSkills(lookup, [200])).toThrow('has no attack values');
    expect(() => selectDamageSkills(lookup, [201])).toThrow('has no attack values');
    expect(() => selectDamageSkills(lookup, [202])).toThrow('does not inherit the base');
  });
});

describe('projectDamageSkill', () => {
  const base = BASE_SKILL;

  it('carries the max-level attack values, class, weapon and family of a base skill', () => {
    const projected = projectDamageSkill(base, base, lookup, {});

    expect(projected).toMatchObject({
      id: BASE,
      classId: BLADE,
      level: 70,
      magic: false,
      weapon: 'sword',
      attack: { min: 20, max: 21 },
      multiplier: 1,
      familyId: BASE,
      baseLevelCount: 2,
      hits: 1,
      levelCount: 2,
    });
    expect(projected.elementType).toBeUndefined();
    expect(projected.arbitraryValue).toBeUndefined();
  });

  it('keeps unconditional multipliers, the element and the numeric arbitrary value', () => {
    const projected = projectDamageSkill(MULTIPLIED_SKILL, base, lookup, {});

    expect(projected).toMatchObject({
      magic: true,
      elementType: 'fire',
      attack: { min: 30, max: 31 },
      multiplier: 0.65,
      arbitraryValue: 50,
      familyId: BASE,
    });
    expect(projected.weapon).toBeUndefined();
  });

  it('takes hit counts by id, then from the base', () => {
    const variation = LISTED_SKILL;

    expect(projectDamageSkill(variation, base, lookup, { [BASE]: 3 }).hits).toBe(3);
    expect(projectDamageSkill(variation, base, lookup, { [LISTED_VARIATION]: 5 }).hits).toBe(5);
    expect(projectDamageSkill(base, base, lookup, { [LISTED_VARIATION]: 5 }).hits).toBe(1);
  });

  it('rejects skills without a class', () => {
    const classless = CLASSLESS_SKILL;

    expect(() => projectDamageSkill(classless, classless, lookup, {})).toThrow('has no class');
  });
});

describe('projectDamageSkills', () => {
  it('lists every base followed by its variations in table order', () => {
    expect(projectDamageSkills(lookup, [BASE], {}).map((skill) => skill.id)).toEqual([
      BASE,
      LISTED_VARIATION,
      MULTIPLIED_VARIATION,
    ]);
  });
});
