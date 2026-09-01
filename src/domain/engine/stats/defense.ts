import { effectiveUpgradeLevel, upgradeFlatBonus, upgradeMultiplier } from '../../rules';
import type { StatContext } from './context';

export interface DefenseRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Summed armor defense before the random roll (flyffentity.js:1571-1598). The game rolls between
 * the two bounds; the engine reports both (FLYFFULATOR_QUIRKS.defenseMaxIsTrueBound).
 */
export function computeEquipmentDefenseRange(ctx: StatContext): DefenseRange {
  let min = 0;
  let max = 0;

  for (const piece of ctx.armorPieces) {
    const upgradeValue = upgradeFlatBonus(effectiveUpgradeLevel(piece.item, piece.upgrade));
    const factor = upgradeMultiplier(ctx.data, piece.item, piece.upgrade);

    min += Math.floor((piece.item.minDefense ?? 0) * factor) + upgradeValue;
    max += Math.floor((piece.item.maxDefense ?? 0) * factor) + upgradeValue;
  }

  min += ctx.total('minability', false);
  max += ctx.total('maxability', false);

  return { min, max };
}

const STA_FACTOR = 0.75;
const LEVEL_SCALE = 2.0 / 2.8;
const STAT_SCALE = 0.5 / 2.8;

/** Auto-attack defense for a given equipment-defense roll (flyffentity.js:840-859, 903-909). */
export function computeDefense(ctx: StatContext, equipmentDefense: number): number {
  const sta = ctx.base('sta');
  let defense = Math.floor(
    ctx.level * LEVEL_SCALE + (sta * STAT_SCALE + (sta - 14) * ctx.job.defense) * STA_FACTOR - 4,
  );

  defense += Math.floor(equipmentDefense / 4);
  defense += ctx.total('def', false);
  defense = Math.floor(defense * (1 + ctx.total('def', true) / 100));

  return Math.max(defense, 0);
}

/**
 * Magic defense as the calculations tab shows it (flyffentity.js:826-835, 903-909;
 * calculations.jsx:227-234). The `def` rate applies here too
 * (FLYFFULATOR_QUIRKS.defenseRateScalesMagicDefense).
 */
export function computeMagicDefense(ctx: StatContext): number {
  let defense = Math.floor(
    ctx.job.magicDefenseIntFactor * ctx.base('int') +
      ctx.job.magicDefenseStaFactor * ctx.base('sta') +
      ctx.total('magicdefense', false),
  );

  defense = Math.floor(defense * (1 + ctx.total('def', true) / 100));
  defense = Math.max(defense, 0);

  return Math.floor(defense + (defense * ctx.total('magicdefense', true)) / 100);
}
