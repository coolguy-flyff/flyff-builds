import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import { CLASS_IDS, loadBundledGameData, requireDamageSkill } from '@/data';
import {
  computeResultsPage,
  playerTarget,
  resolveGearSwap,
  type DamageRange,
  type DamageTarget,
  type ResolvedCharacter,
} from '@/domain/engine';
import { computeBasicDamage } from '@/domain/engine/damage/basic';
import { computeSkillDamage } from '@/domain/engine/damage/skill';
import { DEFAULT_ENGINE_OPTIONS, type EngineOptions } from '@/domain/engine/options';
import { createStatContext } from '@/domain/engine/stats/context';
import { createTestBuild, firstSwap } from '@/domain/engine/testing/builders';
import { requireDefined } from '@/lib/assert';

import { PARITY_FIXTURES } from './fixtures';
import { hasFlyffulator, loadFlyffulator, type FlyffEntity, type Flyffulator } from './flyffulator';
import {
  buildEntity,
  installContext,
  installDamageContext,
  lowerDummy,
  mirrorDamageSkills,
} from './mirror';
import { HIGH_ROLL, queueRolls } from './rolls';

/**
 * Cross-checks the damage rows against Flyffulator's `getDamage` with its randomness pinned:
 * the lowest and highest hit rolls give the bounds the engine shows, the crit roll and the crit
 * factor roll give the crit bounds. Misses, blocks, lifesteal, Swordcross and Muran's Wrath are
 * switched off on both sides.
 */

const RIGHT_HAND = 0x1;
const LEFT_HAND = 0x2;
/** Below full health, so Muran's Wrath stays out on both sides. */
const TARGET_HEALTH_PERCENT = 99;
const OPTIONS: EngineOptions = {
  ...DEFAULT_ENGINE_OPTIONS,
  applyHealSynergy: false,
  targetHealthPercent: TARGET_HEALTH_PERCENT,
};
/** Roll below the crit chance → a crit; above → none. */
const CRIT = 0;
const NO_CRIT = HIGH_ROLL;
/** At this crit chance every roll crits, so Flyffulator has no normal hit to compare. */
const ALWAYS_CRIT_CHANCE = 100;

interface Subject {
  readonly resolved: ResolvedCharacter;
  readonly entity: FlyffEntity;
}

describe.skipIf(!hasFlyffulator())('Flyffulator damage parity', () => {
  const data = loadBundledGameData();
  let fl: Flyffulator;
  let restoreSettings: () => void = () => undefined;

  beforeAll(async () => {
    fl = await loadFlyffulator();
    restoreSettings = installDamageContext(fl, TARGET_HEALTH_PERCENT);
  }, 120_000);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  afterAll(() => {
    restoreSettings();
  });

  function prepare(fixture: (typeof PARITY_FIXTURES)[number]): Subject {
    const { build, swap } = fixture.create(data);
    const resolved = resolveGearSwap(data, build, swap, OPTIONS);
    const entity = buildEntity(fl, data, build, swap);

    mirrorDamageSkills(fl, data, entity, build.character.jobId);
    installContext(fl, entity);
    // `installContext` restores the calculations tab's full-health default.
    fl.Context.settings.targetHealthPercent = TARGET_HEALTH_PERCENT;

    return { resolved, entity };
  }

  /** `getDamage` with the given rolls, for a basic attack or the current `Context.skill`. */
  function damageWith(rolls: readonly number[], handFlag = RIGHT_HAND): number {
    queueRolls(rolls);

    const damage = fl.getDamage(handFlag);

    vi.restoreAllMocks();

    return damage;
  }

  function basicAttack(handFlag: number): { hit: DamageRange; crit: DamageRange } {
    fl.Context.skill = null;
    fl.Context.attackFlags = fl.Utils.ATTACK_FLAGS.GENERIC;

    return {
      hit: {
        min: damageWith([0, NO_CRIT], handFlag),
        max: damageWith([HIGH_ROLL, NO_CRIT], handFlag),
      },
      crit: {
        min: damageWith([0, CRIT, 0], handFlag),
        max: damageWith([HIGH_ROLL, CRIT, 1], handFlag),
      },
    };
  }

  function skillAttack(skillId: number): DamageRange {
    const prop = requireDefined(fl.Utils.getSkillById(skillId), `No skill ${skillId}`);

    fl.Context.skill = prop;
    fl.Context.attackFlags =
      prop.magic === true ? fl.Utils.ATTACK_FLAGS.MAGICSKILL : fl.Utils.ATTACK_FLAGS.MELEESKILL;

    return { min: damageWith([0]), max: damageWith([HIGH_ROLL]) };
  }

  for (const fixture of PARITY_FIXTURES) {
    describe(fixture.name, () => {
      it('matches the basic attack, its crit and its overcrit against the dummy', () => {
        const { resolved } = prepare(fixture);
        const page = computeResultsPage(data, resolved, OPTIONS);
        const basic = page.damage.basic;

        if (basic === null) {
          expect(resolved.job.id === 36983 || resolved.job.id === 54571).toBe(true);

          return;
        }

        const flyffulator = basicAttack(RIGHT_HAND);

        if (page.criticalChance < ALWAYS_CRIT_CHANCE) {
          expect(basic.hit).toEqual(flyffulator.hit);
        }

        expect(basic.crit).toEqual(flyffulator.crit);

        fl.Context.defender = lowerDummy(fl, resolved.level - 1);

        expect(basic.overcrit).toEqual(basicAttack(RIGHT_HAND).crit);
      });

      it('matches the left-hand hit of a dual-wielder', () => {
        const { resolved } = prepare(fixture);
        const page = computeResultsPage(data, resolved, OPTIONS);

        if (page.damage.leftHand === null) {
          expect(resolved.offhand?.kind === 'weapon' && resolved.job.id === CLASS_IDS.slayer).toBe(
            false,
          );

          return;
        }

        expect(page.damage.leftHand.hit).toEqual(basicAttack(LEFT_HAND).hit);
        expect(page.damage.leftHand.crit).toEqual(basicAttack(LEFT_HAND).crit);
      });

      it('matches every usable curated skill against the dummy', () => {
        const { resolved } = prepare(fixture);
        const page = computeResultsPage(data, resolved, OPTIONS);
        // Empty when the mainhand fits none of the job's skills (a Seraph with a knuckle).
        const skillIds = Object.keys(page.damage.skills).map(Number);

        for (const skillId of skillIds) {
          const skill = requireDefined(page.damage.skills[skillId], `skill ${skillId}`);

          expect(skill.range, requireDamageSkill(data, skillId).name).toEqual(skillAttack(skillId));
        }
      });

      it('matches a player-versus-player hit on a bare STA Templar', () => {
        const { resolved } = prepare(fixture);
        const defenderBuild = createTestBuild(data, {
          jobId: CLASS_IDS.templar,
          stats: { sta: 400 },
        });
        const defenderPage = computeResultsPage(
          data,
          resolveGearSwap(data, defenderBuild, firstSwap(defenderBuild), OPTIONS),
          OPTIONS,
        );
        const target: DamageTarget = playerTarget(
          {
            choice: { kind: 'preset', id: 'parity' },
            name: 'Bare STA Templar',
            stats: {
              defense: defenderPage.defenseMin,
              magicDefense: defenderPage.magicDefense,
              magicResistance: 0,
              criticalResist: 0,
              pvpDamageReduction: 0,
              incomingDamage: 0,
            },
          },
          resolved.level,
        );
        const ctx = createStatContext(data, resolved);

        expect(defenderPage.defenseMax).toBe(defenderPage.defenseMin);

        fl.Context.defender = buildEntity(fl, data, defenderBuild, firstSwap(defenderBuild));

        const basic = computeBasicDamage(ctx, target, null, 'mainhand', OPTIONS);

        if (basic !== null) {
          const flyffulator = basicAttack(RIGHT_HAND);

          if (computeResultsPage(data, resolved, OPTIONS).criticalChance < ALWAYS_CRIT_CHANCE) {
            expect(basic.hit).toEqual(flyffulator.hit);
          }

          expect(basic.crit).toEqual(flyffulator.crit);
        }

        for (const skillId of Object.keys(
          computeResultsPage(data, resolved, OPTIONS).damage.skills,
        ).map(Number)) {
          const skill = computeSkillDamage(ctx, requireDamageSkill(data, skillId), target, OPTIONS);

          expect(skill.range, requireDamageSkill(data, skillId).name).toEqual(skillAttack(skillId));
        }
      });
    });
  }
});
