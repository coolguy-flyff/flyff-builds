import { CLASS_IDS, type GameData } from '@/data';

import { getRawTotals, type StatBucket } from '../abilities/totals';
import { computeHealingSkills, type HealingSkills } from '../healing/healing';
import { DEFAULT_ENGINE_OPTIONS, type EngineOptions } from '../options';
import type { ResolvedCharacter } from '../types';
import { computeAttack } from './attack';
import {
  computeBlockBreakdown,
  computeCriticalChance,
  computeHitRate,
  computeParry,
  type BlockBreakdown,
} from './combat';
import { createStatContext } from './context';
import { computeDefense, computeEquipmentDefenseRange, computeMagicDefense } from './defense';
import {
  attackSpeedPercent,
  computeAttackSpeedFactor,
  computeCastingSpeed,
  computeJumpHeight,
  computeMovementSpeed,
} from './speed';
import {
  computeFpBreakdown,
  computeHpBreakdown,
  computeMpBreakdown,
  type VitalBreakdown,
} from './vitals';

/** One results column: every row of plan A4.2 for a resolved swap. */
export interface ResultsPage {
  readonly str: number;
  readonly sta: number;
  readonly dex: number;
  readonly int: number;
  readonly hp: number;
  readonly mp: number;
  readonly fp: number;
  readonly hpBreakdown: VitalBreakdown;
  readonly mpBreakdown: VitalBreakdown;
  readonly fpBreakdown: VitalBreakdown;
  readonly movementSpeed: number;
  readonly jumpHeight: number;
  readonly castingSpeed: number;
  readonly attackSpeed: number;
  readonly attack: number;
  readonly magicAttack: number;
  readonly skillDamage: number;
  readonly pveDamage: number;
  readonly pvpDamage: number;
  readonly hitRate: number;
  readonly criticalChance: number;
  readonly criticalDamage: number;
  readonly blockPenetration: number;
  readonly healing: number;
  readonly defenseMin: number;
  readonly defenseMax: number;
  readonly magicDefense: number;
  readonly magicResistance: number;
  readonly criticalResist: number;
  readonly incomingDamage: number;
  readonly pveDamageReduction: number;
  readonly pvpDamageReduction: number;
  readonly parry: number;
  /** Block before the attacker is known, uncapped (see {@link BlockBreakdown}). */
  readonly meleeBlock: number;
  readonly rangedBlock: number;
  readonly meleeBlockBreakdown: BlockBreakdown;
  readonly rangedBlockBreakdown: BlockBreakdown;
  /** Only for Seraphs. */
  readonly healingSkills: HealingSkills | null;
  /** Every parameter with a non-zero total, for the optional raw-totals group. */
  readonly rawTotals: Readonly<Record<string, StatBucket>>;
}

export function computeResultsPage(
  data: GameData,
  resolved: ResolvedCharacter,
  options: EngineOptions = DEFAULT_ENGINE_OPTIONS,
): ResultsPage {
  const ctx = createStatContext(data, resolved);
  const rate = (parameter: string): number => ctx.total(parameter, true);
  const equipmentDefense = computeEquipmentDefenseRange(ctx);
  const hp = computeHpBreakdown(ctx);
  const mp = computeMpBreakdown(ctx);
  const fp = computeFpBreakdown(ctx);
  const meleeBlock = computeBlockBreakdown(ctx, false);
  const rangedBlock = computeBlockBreakdown(ctx, true);

  return {
    str: ctx.base('str'),
    sta: ctx.base('sta'),
    dex: ctx.base('dex'),
    int: ctx.base('int'),
    hp: hp.total,
    mp: mp.total,
    fp: fp.total,
    hpBreakdown: hp,
    mpBreakdown: mp,
    fpBreakdown: fp,
    movementSpeed: computeMovementSpeed(ctx),
    jumpHeight: computeJumpHeight(ctx),
    castingSpeed: computeCastingSpeed(ctx),
    attackSpeed: attackSpeedPercent(computeAttackSpeedFactor(ctx)),
    attack: computeAttack(ctx),
    magicAttack: rate('magicattack'),
    skillDamage: rate('skilldamage'),
    pveDamage: rate('pvedamage'),
    pvpDamage: rate('pvpdamage'),
    hitRate: computeHitRate(ctx).probAdjusted,
    criticalChance: computeCriticalChance(ctx),
    criticalDamage: rate('criticaldamage'),
    blockPenetration: rate('blockpenetration'),
    healing: rate('healing'),
    defenseMin: computeDefense(ctx, equipmentDefense.min),
    defenseMax: computeDefense(ctx, equipmentDefense.max),
    magicDefense: computeMagicDefense(ctx),
    magicResistance: rate('magicdefense'),
    criticalResist: rate('criticalresist'),
    incomingDamage: rate('incomingdamage'),
    pveDamageReduction: rate('pvedamagereduction'),
    pvpDamageReduction: rate('pvpdamagereduction'),
    parry: computeParry(ctx),
    meleeBlock: meleeBlock.total,
    rangedBlock: rangedBlock.total,
    meleeBlockBreakdown: meleeBlock,
    rangedBlockBreakdown: rangedBlock,
    healingSkills:
      resolved.job.id === CLASS_IDS.seraph ? computeHealingSkills(data, ctx, options) : null,
    rawTotals: getRawTotals(resolved),
  };
}
