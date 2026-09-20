import { describe, expect, it } from 'vitest';

import { PVP_TARGET_PRESETS, type PvpTargetStats } from '@/config/pvpTargets';
import {
  CLASS_IDS,
  loadBundledGameData,
  requireDamageSkill,
  requireItem,
  skillAwakeParameter,
} from '@/data';
import { createPvpTarget } from '@/domain/build/defaults';
import { requireDefined } from '@/lib/assert';

import { DEFAULT_ENGINE_OPTIONS } from '../options';
import { resolveGearSwap } from '../resolve';
import { createStatContext } from '../stats/context';
import { computeMp } from '../stats/vitals';
import { addShield, addWeapon, createTestBuild, firstSwap } from '../testing/builders';
import { computeDamageResults } from './damage';
import { applyAttackDefense, finishDamage } from './defense';
import { computeSkillPower, isSkillUsable, skillDamageSignature } from './skill';
import { playerTarget, resolveDamageTarget, trainingDummyTarget } from './target';
import type { DamageTargetChoice } from './types';

const data = loadBundledGameData();
const SQUISHY: DamageTargetChoice = { kind: 'preset', id: 'squishy' };
const TANK = requireDefined(
  PVP_TARGET_PRESETS.find((preset) => preset.id === 'tank'),
  'tank preset',
);

/** A player target with the given window numbers, outside any preset or build. */
function testPlayerTarget(stats: PvpTargetStats, level = 190) {
  return playerTarget({ choice: SQUISHY, name: 'X', stats }, level);
}

const ORACLE_ULTIMATE = 54987;
const BLOODY_OBSIDIAN_KNUCKLE = 3763;
const AZURE_SHIELD = 469;
const FWC_GOLDEN_K_FANG = 47197;
const HAMMER_OF_JUDGEMENT = 30021;
const SHIELD_CRUSH = 50505;
const ASAL = 5041;
const NEN_SPHERE = 38428;
const ARCANIST = 36983;
const FORCEMASTER = 43403;
const MENTALIST = 54571;
const MAXIMUM_CRISIS = 6026;

function damageOf(build: ReturnType<typeof createTestBuild>, options = DEFAULT_ENGINE_OPTIONS) {
  const resolved = resolveGearSwap(data, build, firstSwap(build), options);

  return computeDamageResults(data, createStatContext(data, resolved), options);
}

describe('applyAttackDefense', () => {
  it('takes nothing without defense and a growing share as the defense grows', () => {
    expect(applyAttackDefense(8000, 0)).toBe(8000);
    expect(applyAttackDefense(8000, 416)).toBe(6377);
    expect(applyAttackDefense(8000, 5000)).toBe(1537);
  });
});

describe('trainingDummyTarget', () => {
  it('scales the dummy to the character level with the monster defense formulas', () => {
    const dummy = trainingDummyTarget(190);

    expect(dummy.defense).toEqual({ basic: 185, meleeSkill: 37, magicSkill: 0 });
    expect(dummy.mode).toBe('pve');
    expect(trainingDummyTarget(189).defense.basic).toBe(183);
  });

  it('scales a player target through the PvP factor', () => {
    const target = testPlayerTarget({
      defense: 5000,
      magicDefense: 2000,
      magicResistance: 20,
      criticalResist: 7,
      pvpDamageReduction: 10,
      incomingDamage: -5,
    });

    // Magic: the window's 2000 carries the 20 % resistance boost; 2000 / 1.2 × 0.6 = 1000.
    expect(target.defense).toEqual({ basic: 3000, meleeSkill: 3000, magicSkill: 1000 });
    expect(target.mode).toBe('pvp');
    expect(target.criticalResist).toBe(7);
    expect(target.stats.map((stat) => stat.label)).toContain('Crit resist');
  });
});

describe('resolveDamageTarget', () => {
  const custom = createPvpTarget(7, 'Guildie', {
    defense: 15000,
    magicDefense: 7000,
    magicResistance: 30,
    criticalResist: 20,
    pvpDamageReduction: 20,
    incomingDamage: -8,
  });

  it('resolves presets and the build’s custom targets', () => {
    expect(resolveDamageTarget(SQUISHY, 190).name).toBe('Squishy');
    expect(resolveDamageTarget({ kind: 'custom', id: 7 }, 190, [custom])).toMatchObject({
      name: 'Guildie',
      mode: 'pvp',
      // 7000 / 1.3 (the 30 % resistance boost taken out) × 0.6, floored.
      defense: { basic: 9000, magicSkill: 3230 },
      criticalResist: 20,
    });
  });

  it('falls back to the dummy for a choice nothing answers to', () => {
    expect(resolveDamageTarget({ kind: 'custom', id: 99 }, 190, [custom]).mode).toBe('pve');
    expect(resolveDamageTarget({ kind: 'preset', id: 'gone' }, 190).mode).toBe('pve');
  });
});

describe('basic attacks (bare Seraph STA 400 vs the Lv 190 dummy)', () => {
  const damage = damageOf(createTestBuild(data, { stats: { sta: 400 } }));
  const basic = requireDefined(damage.basic, 'basic');

  it('loses 201–203 of the 216–218 fists to the dummy defense', () => {
    expect(basic.breakdown).toMatchObject({ attack: { min: 216, max: 218 }, defense: 185 });
    expect(basic.hit).toEqual({ min: 15, max: 15 });
    expect(basic.average).toBe(15);
  });

  it('crits at 1.1–1.4× and overcrits at 1.2–2.0× against the Lv 189 dummy', () => {
    expect(basic.crit).toEqual({ min: 16, max: 21 });
    expect(basic.overcrit).toEqual({ min: 18, max: 32 });
  });

  it('has no left hand for a Seraph and no skills below their level', () => {
    expect(damage.leftHand).toBeNull();
    expect(Object.keys(damage.skills)).toHaveLength(0);
  });
});

describe('Seraph with Oracle +10 (regression pins from the engine)', () => {
  const build = createTestBuild(data, { stats: { sta: 400 } });

  addWeapon(build, { itemId: ORACLE_ULTIMATE, upgrade: 10 });

  const damage = damageOf(build);

  it('pins the basic attack rows', () => {
    const basic = requireDefined(damage.basic, 'basic');

    expect(basic.breakdown.attack).toEqual({ min: 2880, max: 2888 });
    expect(basic.breakdown.attackMultiplier).toBeCloseTo(1.19);
    expect(basic.hit).toEqual({ min: 2220, max: 2227 });
    expect(basic.average).toBe(2223);
    expect(basic.crit).toEqual({ min: 2442, max: 3117 });
    expect(basic.overcrit).toEqual({ min: 2668, max: 4462 });
  });

  it('pins Hammer of Judgement, a magic skill against zero magic defense', () => {
    const hammer = requireDefined(damage.skills[HAMMER_OF_JUDGEMENT], 'Hammer of Judgement');

    expect(hammer.breakdown.defense).toBe(0);
    expect(hammer.range).toEqual({ min: 8479, max: 8497 });
    expect(hammer.average).toBe(8488);
    expect(hammer.hits).toBe(1);
  });

  it('applies the PvP factor and the preset’s defense', () => {
    const pvp = damageOf(build, { ...DEFAULT_ENGINE_OPTIONS, target: SQUISHY });
    const basic = requireDefined(pvp.basic, 'basic');

    expect(pvp.target.mode).toBe('pvp');
    expect(basic.overcrit).toBeNull();
    expect(basic.breakdown.factor).toBeCloseTo(0.6);
    // Squishy: defense 2000 × 0.6 = 1200 against the fists, then the 0.6 PvP factor.
    expect(basic.breakdown.defense).toBe(1200);
    expect(basic.hit).toEqual({ min: 589, max: 592 });
    // Squishy's magic defense 1500 × 0.6 = 900 meets the magic skill, unlike the dummy's 0.
    const hammer = requireDefined(pvp.skills[HAMMER_OF_JUDGEMENT], 'hammer');

    expect(hammer.breakdown.defense).toBe(900);
    expect(hammer.average).toBeLessThan(
      requireDefined(damage.skills[HAMMER_OF_JUDGEMENT], 'hammer').average / 2,
    );
  });

  it('scales the crit chance by the target’s crit resist and leaves the damage alone', () => {
    const pve = requireDefined(damage.basic, 'basic');
    const tank = damageOf(build, {
      ...DEFAULT_ENGINE_OPTIONS,
      target: { kind: 'preset', id: TANK.id },
    });
    const basic = requireDefined(tank.basic, 'basic');

    expect(pve.criticalChance).toBe(pve.breakdown.criticalChance);
    expect(basic.breakdown.criticalResist).toBe(TANK.criticalResist);
    expect(basic.criticalChance).toBeCloseTo(pve.criticalChance * (1 - TANK.criticalResist / 100));
    expect(basic.breakdown.critBonus).toBe(pve.breakdown.critBonus);
  });

  it('hits a custom target of the build like a preset', () => {
    const custom = createPvpTarget(9, 'Guildie', requireDefined(PVP_TARGET_PRESETS[0], 'squishy'));
    const viaPreset = damageOf(build, { ...DEFAULT_ENGINE_OPTIONS, target: SQUISHY });
    const viaCustom = damageOf(build, {
      ...DEFAULT_ENGINE_OPTIONS,
      target: { kind: 'custom', id: 9 },
      customTargets: [custom],
    });

    expect(viaCustom.target.name).toBe('Guildie');
    expect(viaCustom.basic).toEqual(viaPreset.basic);
    expect(viaCustom.skills).toEqual(viaPreset.skills);
  });
});

describe('finishDamage', () => {
  const build = createTestBuild(data);
  const ctx = createStatContext(data, resolveGearSwap(data, build, firstSwap(build)));

  it('applies the target’s incoming damage and reduction and floors at 1', () => {
    const target = testPlayerTarget({
      defense: 1,
      magicDefense: 1,
      magicResistance: 0,
      criticalResist: 0,
      pvpDamageReduction: 80,
      incomingDamage: -60,
    });

    // −60 % incoming is cut to −50 %, the reduction to 50 %: 1000 → 500 → 250.
    expect(finishDamage(1000, ctx, target, DEFAULT_ENGINE_OPTIONS)).toBe(250);
    expect(finishDamage(0, ctx, target, DEFAULT_ENGINE_OPTIONS)).toBe(1);
  });
});

describe('dual wield, shields and weapon requirements', () => {
  it('adds a left-hand hit for a Slayer with a second weapon', () => {
    const build = createTestBuild(data, { jobId: CLASS_IDS.slayer, stats: { str: 300 } });

    addWeapon(build, { itemId: FWC_GOLDEN_K_FANG, upgrade: 10 });
    addWeapon(build, { itemId: FWC_GOLDEN_K_FANG, upgrade: 5 }, 'offhand');

    const damage = damageOf(build);
    const left = requireDefined(damage.leftHand, 'left hand');

    expect(left.breakdown.factor).toBeCloseTo(0.75);
    expect(left.average).toBeLessThan(requireDefined(damage.basic, 'basic').average);
    expect(left.breakdown.attack.max).toBeLessThan(
      requireDefined(damage.basic, 'basic').breakdown.attack.max,
    );
  });

  it('offers shield skills only with a shield in the offhand', () => {
    const build = createTestBuild(data, { jobId: CLASS_IDS.templar });
    const shieldCrush = requireDamageSkill(data, SHIELD_CRUSH);
    const sword = requireDefined(
      data.weaponsByJob.get(CLASS_IDS.templar)?.find((item) => item.twoHanded !== true),
      'a one-handed Templar weapon',
    );

    addWeapon(build, { itemId: sword.id, upgrade: 10 });

    const bare = resolveGearSwap(data, build, firstSwap(build));

    expect(isSkillUsable(createStatContext(data, bare), shieldCrush)).toBe(false);

    addShield(build, { itemId: AZURE_SHIELD, upgrade: 10 });

    const shielded = resolveGearSwap(data, build, firstSwap(build));

    expect(isSkillUsable(createStatContext(data, shielded), shieldCrush)).toBe(true);
    expect(damageOf(build).skills[SHIELD_CRUSH]).toBeDefined();
  });

  it('shows no basic attacks for the magician chain', () => {
    const build = createTestBuild(data, { jobId: ARCANIST, stats: { int: 300 } });
    const damage = damageOf(build);

    expect(damage.basic).toBeNull();
    expect(damage.leftHand).toBeNull();
  });

  it('locks skills above the character level and behind the wrong weapon', () => {
    const build = createTestBuild(data, { jobId: CLASS_IDS.templar, level: 165 });
    const ctx = createStatContext(data, resolveGearSwap(data, build, firstSwap(build)));

    for (const skill of data.damageSkills.values()) {
      if (skill.classId === CLASS_IDS.templar) {
        expect(isSkillUsable(ctx, skill), skill.name).toBe(false);
      }
    }

    expect(isSkillUsable(ctx, requireDamageSkill(data, HAMMER_OF_JUDGEMENT))).toBe(false);
  });
});

describe('Forcemaster specials', () => {
  const build = createTestBuild(data, { jobId: FORCEMASTER, stats: { str: 300 } });

  addWeapon(build, { itemId: BLOODY_OBSIDIAN_KNUCKLE, upgrade: 10 });

  const resolved = resolveGearSwap(data, build, firstSwap(build));
  const ctx = createStatContext(data, resolved);
  const damage = damageOf(build);

  it('scales Nen Sphere by the mainhand weapon’s average attack', () => {
    const knuckle = requireItem(data, BLOODY_OBSIDIAN_KNUCKLE);
    const nenSphere = requireDamageSkill(data, NEN_SPHERE);
    const withWeapon = computeSkillPower(ctx, nenSphere, 'pve');
    const bareHands = computeSkillPower(
      { ...ctx, mainhand: { item: { ...knuckle, minAttack: 0, maxAttack: 0 }, upgrade: 10 } },
      nenSphere,
      'pve',
    );

    expect(withWeapon.min).toBeGreaterThan(bareHands.min);
    expect(nenSphere.max.scalingParameters.some((scale) => scale.part === 'righthandweapon')).toBe(
      true,
    );
  });

  it('adds Asal’s STR × MP bonus after the (zero) magic defense in PvE', () => {
    const asal = requireDefined(damage.skills[ASAL], 'Asal');
    const bonus = Math.floor(
      Math.floor(ctx.base('str') / 10) * 10 * (5 + Math.floor(computeMp(ctx) / 10)) + 150,
    );

    expect(asal.breakdown.factor).toBeCloseTo(0.65);
    expect(asal.breakdown.defense).toBe(0);
    expect(asal.range.min).toBe(Math.floor((asal.breakdown.attack.min + bonus) * 0.65));
  });
});

describe('party skills', () => {
  const build = createTestBuild(data, { stats: { sta: 400 } });

  addWeapon(build, { itemId: ORACLE_ULTIMATE, upgrade: 10 });

  const plain = damageOf(build);
  const global = damageOf(build, { ...DEFAULT_ENGINE_OPTIONS, partySkill: 'global' });
  const linked = damageOf(build, { ...DEFAULT_ENGINE_OPTIONS, partySkill: 'linked' });

  it('adds the per-member bonus of a full party against the dummy, after the defense', () => {
    const before = requireDefined(plain.basic, 'basic');
    const withGlobal = requireDefined(global.basic, 'basic');
    const withLinked = requireDefined(linked.basic, 'basic');

    // 8 members × 5 % = +40 %, floored on the post-defense hit; 8 × 2.5 % = +20 %.
    expect(withGlobal.breakdown.partyBonus).toBe(40);
    expect(withLinked.breakdown.partyBonus).toBe(20);
    expect(withGlobal.hit.max).toBeGreaterThanOrEqual(Math.floor(before.hit.max * 1.4) - 1);
    expect(withGlobal.hit.max).toBeLessThanOrEqual(Math.floor(before.hit.max * 1.4) + 1);
    expect(withLinked.hit.max).toBeGreaterThanOrEqual(Math.floor(before.hit.max * 1.2) - 1);
    expect(withLinked.hit.max).toBeLessThanOrEqual(Math.floor(before.hit.max * 1.2) + 1);

    const hammer = requireDefined(plain.skills[HAMMER_OF_JUDGEMENT], 'hammer');
    const hammerGlobal = requireDefined(global.skills[HAMMER_OF_JUDGEMENT], 'hammer');

    expect(hammerGlobal.breakdown.partyBonus).toBe(40);
    expect(hammerGlobal.range.max).toBeGreaterThan(hammer.range.max);
  });

  it('does nothing against a player', () => {
    const pvp = { ...DEFAULT_ENGINE_OPTIONS, target: SQUISHY };
    const before = damageOf(build, pvp);
    const after = damageOf(build, { ...pvp, partySkill: 'global' });

    expect(after.basic?.hit).toEqual(before.basic?.hit);
    expect(after.basic?.breakdown.partyBonus).toBe(0);
    expect(after.skills[HAMMER_OF_JUDGEMENT]?.range).toEqual(
      before.skills[HAMMER_OF_JUDGEMENT]?.range,
    );
  });
});

describe('skillDamageSignature', () => {
  it('treats variations that only change a non-damage arbitrary value as the same damage', () => {
    // Execution of Justice (Leap of Faith) differs from the base only in its arbitrary data.
    expect(skillDamageSignature(requireDamageSkill(data, 27579))).toBe(
      skillDamageSignature(requireDamageSkill(data, 24229)),
    );
    // Chimera's Curse (Full charge duration increase) only changes the PvP flag of its
    // duration scaling, which the damage never reads.
    expect(skillDamageSignature(requireDamageSkill(data, 20275))).toBe(
      skillDamageSignature(requireDamageSkill(data, 46491)),
    );
    // Hammer of Judgement (Sanctuary Area) adds an HP scaling — a heal, not damage.
    expect(skillDamageSignature(requireDamageSkill(data, 35914))).toBe(
      skillDamageSignature(requireDamageSkill(data, HAMMER_OF_JUDGEMENT)),
    );
    // Flow of Salvation (Increased Damage) raises the attack range.
    expect(skillDamageSignature(requireDamageSkill(data, 55757))).not.toBe(
      skillDamageSignature(requireDamageSkill(data, 32253)),
    );
  });
});

describe('skill-damage awakes', () => {
  const wand = requireDefined(
    data.weaponsByJob.get(MENTALIST)?.find((item) => item.subcategory === 'wand'),
    'a Mentalist wand',
  );

  function mentalistDamage(skillAwake: { parameter: string; value: number } | null) {
    const build = createTestBuild(data, { jobId: MENTALIST, stats: { int: 300 } });

    addWeapon(build, { itemId: wand.id, upgrade: 10, skillAwake });

    return damageOf(build);
  }

  const plain = mentalistDamage(null);
  const awakened = mentalistDamage({
    parameter: skillAwakeParameter(MAXIMUM_CRISIS),
    value: 25,
  });

  it('multiplies the awakened skill’s damage by the awake and reports it', () => {
    const before = requireDefined(plain.skills[MAXIMUM_CRISIS], 'Maximum Crisis');
    const after = requireDefined(awakened.skills[MAXIMUM_CRISIS], 'awakened Maximum Crisis');

    expect(before.breakdown.skillAwake).toBe(0);
    expect(after.breakdown.skillAwake).toBe(25);
    expect(after.breakdown.factor).toBeCloseTo(before.breakdown.factor * 1.25);
    // Floors on either side may differ by one.
    expect(Math.abs(after.range.max - Math.floor(before.range.max * 1.25))).toBeLessThanOrEqual(1);
  });

  it('leaves every other skill alone', () => {
    for (const [skillId, before] of Object.entries(plain.skills)) {
      if (Number(skillId) !== MAXIMUM_CRISIS) {
        expect(awakened.skills[Number(skillId)], skillId).toEqual(before);
      }
    }
  });
});
