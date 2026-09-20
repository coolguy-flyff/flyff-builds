import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID,
  GLORIA_PATRI_SKILL_ID,
  HEAL_RAIN_SKILL_ID,
  loadBundledGameData,
  requireSkill,
  type SlimSkill,
} from '@/data';
import {
  computeResultsPage,
  getStatTotal,
  resolveGearSwap,
  type ResolvedCharacter,
} from '@/domain/engine';
import { DEFAULT_ENGINE_OPTIONS } from '@/domain/engine/options';
import { computeStatScale } from '@/domain/engine/skills/statScale';
import { createStatContext, type StatContext } from '@/domain/engine/stats/context';
import { computeDefense, computeEquipmentDefenseRange } from '@/domain/engine/stats/defense';
import { requireDefined } from '@/lib/assert';

import { PARITY_FIXTURES } from './fixtures';
import { hasFlyffulator, loadFlyffulator, type FlyffEntity, type Flyffulator } from './flyffulator';
import { buildEntity, installContext } from './mirror';

/**
 * The attacker-independent terms of Flyffulator's block (flyffentity.js:1635-1686): the job/DEX
 * term and the gear bonus. The results show exactly these, uncapped, before any attacker.
 */
function blockBeforeAttacker(entity: FlyffEntity, ranged: boolean): number {
  const fromDex = (entity.getBaseStat('dex') / 8) * entity.job.block;
  const fromGear = entity.getStat(ranged ? 'rangedblock' : 'meleeblock', true);

  return Math.max(Math.floor(fromDex + fromGear), 0);
}

/**
 * Flyffulator's critical chance (flyffentity.js:1608-1628) with the game's rounding: the job
 * factor per full 10 DEX, where Flyffulator floors `DEX / 10 × factor` (same result for factor 1).
 */
function criticalChance(entity: FlyffEntity): number {
  const fromDex = Math.floor(entity.getBaseStat('dex') / 10) * entity.job.critical;

  return Math.max(fromDex + entity.getStat('criticalchance', true), 0);
}

/**
 * Flyffulator's heal (flyffdamagecalculator.js:19-63) keeps the game's old level-shifted stat
 * scaling, which `computeStatScale` ports; this rebuilds its number over the engine's stat context
 * so the healing rate and skill data are still cross-checked.
 */
function levelScaledHealing(ctx: StatContext, skill: SlimSkill, statScaleLevel: number): number {
  const base = skill.max.abilities.find((ability) => ability.parameter === 'hp')?.add ?? 0;
  const scaled = computeStatScale(ctx, skill.max.scalingParameters, {
    parameter: 'hp',
    mode: 'pve',
    level: statScaleLevel,
    realScaleLevel: skill.levelCount - 1,
  });
  const output = base + scaled;

  return Math.floor(output + (output * ctx.total('healing', true)) / 100);
}

/**
 * Cross-checks every results row and a sweep of stat totals against Flyffulator's own `Entity`,
 * configured through the same build. Skipped when the Flyffulator checkout is absent
 * (`FLYFFULATOR_DIR`, default `../Flyffulator`).
 *
 * Known, intentional differences (see `FLYFFULATOR_QUIRKS` in the engine):
 * - Defense max: Flyffulator samples `floor(random · (max − min))`, so its highest sample is our
 *   max − 1; the suite pins Flyffulator's max sample against our formula at `equipMax − 1`.
 * - Critical chance: the game grants the job factor per full 10 DEX; Flyffulator floors after
 *   multiplying, so the suite pins its value through `criticalChance` above.
 * - Healing: Flyffulator skips the Gloria Patri ↔ Heal synergy, so our page is computed with
 *   `applyHealSynergy: false` here, and it keeps the game's since-fixed level-shifted scaling
 *   (the engine uses the listed max-level scale), so its heals are pinned against
 *   `levelScaledHealing` above rather than the page.
 */

/** Sweep parameters: every stat the results rows read plus assorted flat/rate lines from gear. */
const SWEEP_PARAMETERS = [
  'str',
  'sta',
  'dex',
  'int',
  'allstats',
  'maxhp',
  'maxmp',
  'maxfp',
  'speed',
  'attackspeed',
  'attackspeedrate',
  'decreasedcastingtime',
  'allspeed',
  'attack',
  'damage',
  'minability',
  'maxability',
  'def',
  'magicdefense',
  'hitrate',
  'parry',
  'block',
  'meleeblock',
  'rangedblock',
  'criticalchance',
  'criticaldamage',
  'criticalresist',
  'blockpenetration',
  'healing',
  'magicattack',
  'skilldamage',
  'pvedamage',
  'pvpdamage',
  'pvedamagereduction',
  'pvpdamagereduction',
  'incomingdamage',
  'jumpheight',
  'stealhp',
  'hprestoration',
  'decreasedmpconsumption',
  'mprecoveryafterkill',
  'hprecoveryafterkill',
  'actionspeed',
  'ankousharvest',
  'firedefense',
  'allelementsdefense',
  'stickattack',
  'knuckleattack',
  'swordattack',
  'spiritstrike',
  'exprate',
] as const;

const NO_SYNERGY = { ...DEFAULT_ENGINE_OPTIONS, applyHealSynergy: false };

interface Subject {
  readonly resolved: ResolvedCharacter;
  readonly entity: FlyffEntity;
  readonly dummy: FlyffEntity;
}

describe.skipIf(!hasFlyffulator())('Flyffulator parity', () => {
  const data = loadBundledGameData();
  let fl: Flyffulator;

  beforeAll(async () => {
    fl = await loadFlyffulator();
  }, 120_000);

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function prepare(fixture: (typeof PARITY_FIXTURES)[number]): Subject {
    const { build, swap } = fixture.create(data);
    const resolved = resolveGearSwap(data, build, swap);

    expect(resolved.issues.map((issue) => issue.code)).toEqual(fixture.expectedIssueCodes);

    const entity = buildEntity(fl, data, build, swap);
    const dummy = installContext(fl, entity);

    return { resolved, entity, dummy };
  }

  function magicDefense(entity: FlyffEntity): number {
    fl.Context.attackFlags = fl.Utils.ATTACK_FLAGS.MAGIC;

    let defense = entity.getDefense();

    defense += (defense * entity.getStat('magicdefense', true)) / 100;
    fl.Context.attackFlags = fl.Utils.ATTACK_FLAGS.GENERIC;

    return Math.floor(defense);
  }

  /** `getHealing` reads the attacker from the context installed by `prepare`. */
  function healing(skillId: number): number {
    return fl.getHealing(requireDefined(fl.Utils.getSkillById(skillId), `skill ${skillId}`));
  }

  for (const fixture of PARITY_FIXTURES) {
    describe(fixture.name, () => {
      it('matches every results row', () => {
        const { resolved, entity, dummy } = prepare(fixture);
        const page = computeResultsPage(data, resolved, NO_SYNERGY);

        expect(page.str).toBe(entity.getBaseStat('str'));
        expect(page.sta).toBe(entity.getBaseStat('sta'));
        expect(page.dex).toBe(entity.getBaseStat('dex'));
        expect(page.int).toBe(entity.getBaseStat('int'));
        expect(page.hp).toBe(entity.getHP());
        expect(page.mp).toBe(entity.getMP());
        expect(page.fp).toBe(entity.getFP());
        expect(page.movementSpeed).toBe(entity.getMovementSpeed());
        expect(page.jumpHeight).toBe((entity.getStat('jumpheight', false) + 200) / 2);
        expect(page.castingSpeed).toBe(100 + entity.getStat('decreasedcastingtime', true));
        expect(page.actionSpeed).toBe(entity.getStat('actionspeed', true));
        expect(page.attackSpeed).toBe(Math.floor(entity.getAttackSpeed() * 100) / 2);
        expect(page.attack).toBe(entity.getAttack());
        expect(page.hitRate).toBe(entity.getContextHitRate(dummy).probAdjusted);
        expect(page.criticalChance).toBe(criticalChance(entity));
        expect(page.parry).toBe(entity.getParry());
        expect(page.meleeBlock).toBe(blockBeforeAttacker(entity, false));
        expect(page.rangedBlock).toBe(blockBeforeAttacker(entity, true));
        expect(page.magicDefense).toBe(magicDefense(entity));
        expect(page.magicAttack).toBe(entity.getStat('magicattack', true));
        expect(page.healing).toBe(entity.getStat('healing', true));
        expect(page.criticalDamage).toBe(entity.getStat('criticaldamage', true));
        expect(page.pveDamageReduction).toBe(entity.getStat('pvedamagereduction', true));
      });

      it('matches defense at both ends of the equipment roll', () => {
        const { resolved, entity } = prepare(fixture);
        const page = computeResultsPage(data, resolved, NO_SYNERGY);
        const ctx = createStatContext(data, resolved);
        const range = computeEquipmentDefenseRange(ctx);
        const random = vi.spyOn(Math, 'random');

        random.mockReturnValue(0);
        expect(entity.getDefense()).toBe(page.defenseMin);

        random.mockReturnValue(0.999999);

        // Flyffulator never rolls the top value (FLYFFULATOR_QUIRKS.defenseMaxIsTrueBound).
        const highestSample = range.max > range.min ? range.max - 1 : range.min;

        expect(entity.getDefense()).toBe(computeDefense(ctx, highestSample));
        expect(page.defenseMax).toBe(computeDefense(ctx, range.max));
      });

      it('matches the healing rows through the level-shifted scaling Flyffulator keeps', () => {
        const { resolved } = prepare(fixture);
        const page = computeResultsPage(data, resolved, NO_SYNERGY);

        if (page.healingSkills === null) {
          expect(resolved.job.name).not.toBe('Seraph');

          return;
        }

        const ctx = createStatContext(data, resolved);
        const healRain = requireSkill(data, HEAL_RAIN_SKILL_ID);
        const gloriaPatri = requireSkill(data, GLORIA_PATRI_SKILL_ID);
        const effectIncrease = requireSkill(data, GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID);

        // Flyffulator feeds 1 for a base skill and the inherited skill's level count for a
        // master variation (flyffdamagecalculator.js:43-53).
        expect(healing(HEAL_RAIN_SKILL_ID)).toBe(levelScaledHealing(ctx, healRain, 1));
        expect(healing(GLORIA_PATRI_SKILL_ID)).toBe(levelScaledHealing(ctx, gloriaPatri, 1));
        expect(healing(GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID)).toBe(
          levelScaledHealing(ctx, effectIncrease, gloriaPatri.levelCount),
        );

        // The listed scale is never below the level-shifted one.
        expect(page.healingSkills.healRain.total).toBeGreaterThanOrEqual(
          healing(HEAL_RAIN_SKILL_ID),
        );
        expect(page.healingSkills.gloriaPatri.total).toBeGreaterThanOrEqual(
          healing(GLORIA_PATRI_SKILL_ID),
        );
      });

      it('matches getStat for a sweep of parameters', () => {
        const { resolved, entity } = prepare(fixture);

        for (const parameter of SWEEP_PARAMETERS) {
          for (const rate of [false, true]) {
            expect(
              getStatTotal(resolved, parameter, rate),
              `${parameter} (${rate ? 'rate' : 'flat'})`,
            ).toBe(entity.getStat(parameter, rate));
          }
        }
      });
    });
  }
});
