import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID,
  GLORIA_PATRI_SKILL_ID,
  HEAL_RAIN_SKILL_ID,
  loadBundledGameData,
} from '@/data';
import {
  computeResultsPage,
  getStatTotal,
  resolveGearSwap,
  type ResolvedCharacter,
} from '@/domain/engine';
import { DEFAULT_ENGINE_OPTIONS } from '@/domain/engine/options';
import { createStatContext } from '@/domain/engine/stats/context';
import { computeDefense, computeEquipmentDefenseRange } from '@/domain/engine/stats/defense';
import { requireDefined } from '@/lib/assert';

import { PARITY_FIXTURES } from './fixtures';
import { hasFlyffulator, loadFlyffulator, type FlyffEntity, type Flyffulator } from './flyffulator';
import { buildEntity, installContext } from './mirror';

/**
 * Cross-checks every results row and a sweep of stat totals against Flyffulator's own `Entity`,
 * configured through the same build. Skipped when the Flyffulator checkout is absent
 * (`FLYFFULATOR_DIR`, default `../Flyffulator`).
 *
 * Known, intentional differences (see `FLYFFULATOR_QUIRKS` in the engine):
 * - Defense max: Flyffulator samples `floor(random · (max − min))`, so its highest sample is our
 *   max − 1; the suite pins Flyffulator's max sample against our formula at `equipMax − 1`.
 * - Healing: Flyffulator skips the Gloria Patri ↔ Heal synergy, so our page is computed with
 *   `applyHealSynergy: false` here.
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
        expect(page.attackSpeed).toBe(Math.floor(entity.getAttackSpeed() * 100) / 2);
        expect(page.attack).toBe(entity.getAttack());
        expect(page.hitRate).toBe(entity.getContextHitRate(dummy).probAdjusted);
        expect(page.criticalChance).toBe(entity.getCriticalChance());
        expect(page.parry).toBe(entity.getParry());
        expect(page.meleeBlock).toBe(
          fl.Utils.clamp(entity.getBlockChance(false, dummy), 6.25, 92.5),
        );
        expect(page.rangedBlock).toBe(
          fl.Utils.clamp(entity.getBlockChance(true, dummy), 6.25, 92.5),
        );
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

      it('matches the healing rows without the Heal synergy', () => {
        const { resolved } = prepare(fixture);
        const page = computeResultsPage(data, resolved, NO_SYNERGY);

        if (page.healingSkills === null) {
          expect(resolved.job.name).not.toBe('Seraph');

          return;
        }

        expect(page.healingSkills.healRain.total).toBe(healing(HEAL_RAIN_SKILL_ID));
        expect(page.healingSkills.gloriaPatri.total).toBe(healing(GLORIA_PATRI_SKILL_ID));
        expect(page.healingSkills.gloriaPatriEffectIncrease.total).toBe(
          healing(GLORIA_PATRI_EFFECT_INCREASE_SKILL_ID),
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
