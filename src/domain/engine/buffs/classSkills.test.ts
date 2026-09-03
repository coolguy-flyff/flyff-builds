import { describe, expect, it } from 'vitest';

import { loadBundledGameData, requireSkill } from '@/data';

import { ENGINE_ISSUE_CODES } from '../issues';
import { resolveGearSwap } from '../resolve';
import { createTestBuild, firstSwap } from '../testing/builders';
import { maxedSkillContributions } from './maxedSkill';

const data = loadBundledGameData();
const BEEF_UP = 690;
const HEAVENS_STEP = 55834;
const HEAVENS_STEP_CRITICAL_RESISTANCE = 43355;
const INCREASED_HP_RECOVERY = 31994;
const IRE_OF_IBLIS = 21731;

describe('maxedSkillContributions', () => {
  it('applies caster-stat scalings at their cap', () => {
    expect(maxedSkillContributions(requireSkill(data, BEEF_UP), 'rmBuff')).toEqual([
      expect.objectContaining({ parameter: 'str', add: 40, rate: false }),
    ]);
  });

  it('adds synergies with the source skill at its maximum level', () => {
    // Block/parry +10% at Lv 5, +2 per Cat's Reflex level above 15 (Cat's Reflex maxes at 20).
    const lines = maxedSkillContributions(requireSkill(data, HEAVENS_STEP), 'classSkill');

    expect(lines).toEqual([
      expect.objectContaining({ parameter: 'block', add: 20, rate: true }),
      expect.objectContaining({ parameter: 'parry', add: 20, rate: true }),
    ]);
    expect(lines[0]?.origin).toMatchObject({ kind: 'classSkill', label: "Heaven's Step" });
  });

  it('floors a fractional synergy bonus, as the game does', () => {
    // Heaven's Step (Critical Resistance): 5% + floor(0.5 × 5 Cat's Reflex levels above 15) = 7%
    // (the game shows 7%, not 7.5% — confirmed in game 2026-09-03).
    expect(
      maxedSkillContributions(requireSkill(data, HEAVENS_STEP_CRITICAL_RESISTANCE), 'classSkill'),
    ).toContainEqual(expect.objectContaining({ parameter: 'criticalresist', add: 7, rate: true }));
  });

  it('skips scalings without a cap and scalings by another stat', () => {
    // incominghealing +30% scales by INT without a maximum; auraeffect is not a caster stat.
    expect(
      maxedSkillContributions(requireSkill(data, INCREASED_HP_RECOVERY), 'classSkill'),
    ).toEqual([expect.objectContaining({ parameter: 'incominghealing', add: 30 })]);
    // Ire of Iblis: the aura-effect scalings are skipped; the Heap Up synergy (+1 per level
    // above 11, Heap Up maxes at 20) still lifts the element defense from 1 to 10.
    expect(
      maxedSkillContributions(requireSkill(data, IRE_OF_IBLIS), 'classSkill').map((line) => [
        line.parameter,
        line.add,
      ]),
    ).toEqual([
      ['incomingdamage', -10],
      ['criticalresist', 10],
      ['allelementsdefense', 10],
      ['incomingdamage', 15],
    ]);
  });
});

describe('class skills in a resolved swap', () => {
  it('contributes every active class skill and reports unknown ids', () => {
    const build = createTestBuild(data, { classSkillIds: [HEAVENS_STEP, 424242] });
    const resolved = resolveGearSwap(data, build, firstSwap(build));
    const classLines = resolved.contributions.filter((line) => line.origin.kind === 'classSkill');

    expect(classLines.map((line) => [line.parameter, line.add])).toEqual([
      ['block', 20],
      ['parry', 20],
    ]);
    expect(resolved.issues).toEqual([
      expect.objectContaining({ code: ENGINE_ISSUE_CODES.unknownSkill }),
    ]);
  });

  it('skips a skill above the character level and reports it as locked', () => {
    // Heaven's Step needs Lv 175; at Lv 170 it stays selected but contributes nothing.
    const build = createTestBuild(data, { level: 170, classSkillIds: [HEAVENS_STEP] });
    const resolved = resolveGearSwap(data, build, firstSwap(build));

    expect(resolved.contributions.some((line) => line.origin.kind === 'classSkill')).toBe(false);
    expect(resolved.issues).toEqual([
      expect.objectContaining({
        code: ENGINE_ISSUE_CODES.skillLocked,
        message: "Heaven's Step needs Lv 175 (character is Lv 170) and was skipped",
      }),
    ]);
  });
});
