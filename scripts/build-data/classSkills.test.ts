import { describe, expect, it } from 'vitest';

import {
  classSkillKind,
  isClassSkillCandidate,
  projectClassSkill,
  selectClassSkills,
} from './classSkills';
import type { RawClass, RawSkill } from './source';

const VAGRANT = 1;
const ASSIST = 2;
const RINGMASTER = 3;
const SERAPH = 4;
const MERCENARY = 5;
const TEMPLAR = 6;

function rawClass(id: number, type: RawClass['type'], parent?: number): RawClass {
  return {
    id,
    name: { en: `Class ${id}` },
    icon: 'x.png',
    type,
    ...(parent === undefined ? {} : { parent }),
    minLevel: 1,
    maxLevel: 190,
    hp: 1,
    mp: 1,
    fp: 1,
    defense: 1,
    magicDefenseStaFactor: 1,
    magicDefenseIntFactor: 1,
    attackSpeed: 70,
    block: 1,
    critical: 1,
    autoAttackFactors: {},
  };
}

/** The real ids of the Assist / Ringmaster classes are what the exclusion keys on. */
const classes: Record<string, RawClass> = {
  [VAGRANT]: rawClass(VAGRANT, 'beginner'),
  [ASSIST]: { ...rawClass(ASSIST, 'expert', VAGRANT), id: 8962 },
  [RINGMASTER]: { ...rawClass(RINGMASTER, 'professional', 8962), id: 9389 },
  [SERAPH]: rawClass(SERAPH, 'specialist', 9389),
  [MERCENARY]: rawClass(MERCENARY, 'expert', VAGRANT),
  [TEMPLAR]: rawClass(TEMPLAR, 'specialist', MERCENARY),
};

function rawSkill(overrides: Partial<RawSkill> & Pick<RawSkill, 'id'>): RawSkill {
  return {
    name: { en: `Skill ${overrides.id}` },
    icon: 'x.png',
    class: TEMPLAR,
    level: 166,
    target: 'currentplayer',
    levels: [{ abilities: [{ parameter: 'attack', add: 5, rate: true }], duration: 60 }],
    ...overrides,
  };
}

const lookup = (skillId: number): RawSkill | undefined =>
  ({
    10: rawSkill({
      id: 10,
      levels: Array<RawSkill['levels']>(20)
        .fill([])
        .map(() => ({})),
    }),
  })[skillId];

describe('isClassSkillCandidate', () => {
  it('keeps stat-granting buffs and drops debuffs, attacks and status-only skills', () => {
    expect(isClassSkillCandidate(rawSkill({ id: 1 }))).toBe(true);
    expect(isClassSkillCandidate(rawSkill({ id: 2, debuff: true }))).toBe(false);
    expect(
      isClassSkillCandidate(
        rawSkill({
          id: 3,
          levels: [{ abilities: [{ parameter: 'attack', add: 5, rate: true }], minAttack: 100 }],
        }),
      ),
    ).toBe(false);
    expect(
      isClassSkillCandidate(
        rawSkill({ id: 4, levels: [{ abilities: [{ parameter: 'attribute', add: 1 }] }] }),
      ),
    ).toBe(false);
    expect(
      isClassSkillCandidate(
        rawSkill({ id: 5, levels: [{ abilities: [{ parameter: 'hp', add: 600 }] }] }),
      ),
    ).toBe(false);
    expect(isClassSkillCandidate(rawSkill({ id: 6, levels: [] }))).toBe(false);
  });
});

describe('classSkillKind', () => {
  it('splits passives, self-buffs and buffs castable on others', () => {
    expect(classSkillKind(rawSkill({ id: 1, passive: true }))).toBe('passive');
    expect(classSkillKind(rawSkill({ id: 2, target: 'currentplayer' }))).toBe('selfBuff');
    expect(classSkillKind(rawSkill({ id: 3, target: 'party' }))).toBe('classBuff');
    expect(classSkillKind(rawSkill({ id: 4, target: 'single' }))).toBe('classBuff');
  });
});

describe('selectClassSkills', () => {
  it('takes every chain except the RM buff classes and keeps one skill per distinct effect', () => {
    const base = rawSkill({ id: 100, class: SERAPH });
    const sameEffect = rawSkill({ id: 50, class: SERAPH, inheritSkill: 100 });
    const strongerEffect = rawSkill({
      id: 120,
      class: SERAPH,
      inheritSkill: 100,
      levels: [{ abilities: [{ parameter: 'attack', add: 8, rate: true }], duration: 60 }],
    });
    const skills: Record<string, RawSkill> = {
      50: sameEffect,
      100: base,
      120: strongerEffect,
      200: rawSkill({ id: 200, class: 8962 }),
      201: rawSkill({ id: 201, class: 9389 }),
      300: rawSkill({ id: 300, class: MERCENARY }),
      301: rawSkill({ id: 301, class: TEMPLAR, debuff: true }),
      302: rawSkill({ id: 302, class: VAGRANT }),
      303: rawSkill({ id: 303, class: undefined }),
    };

    expect(selectClassSkills(skills, classes).map((skill) => skill.id)).toEqual([
      100, 120, 300, 302,
    ]);
  });
});

describe('projectClassSkill', () => {
  it('carries class, level, kind, family and permanence', () => {
    const passive = projectClassSkill(
      rawSkill({
        id: 7,
        class: MERCENARY,
        level: 40,
        passive: true,
        levels: [{ abilities: [{ parameter: 'swordattack', add: 100 }], duration: 3600 }],
      }),
      lookup,
    );
    const variation = projectClassSkill(rawSkill({ id: 8, inheritSkill: 7 }), lookup);

    expect(passive).toMatchObject({
      id: 7,
      classId: MERCENARY,
      level: 40,
      kind: 'passive',
      familyId: 7,
      permanent: true,
      durationSeconds: 3600,
    });
    expect(variation).toMatchObject({ kind: 'selfBuff', familyId: 7, permanent: false });
  });

  it('marks short passives (triggered effects) as not permanent', () => {
    const triggered = projectClassSkill(
      rawSkill({
        id: 9,
        passive: true,
        levels: [{ abilities: [{ parameter: 'speed', add: 20, rate: true }], duration: 3 }],
      }),
      lookup,
    );

    expect(triggered.permanent).toBe(false);
  });
});
