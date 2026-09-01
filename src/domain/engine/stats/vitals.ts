import type { StatContext } from './context';

/**
 * Flat bonuses clamp at zero, rates do not (FLYFFULATOR_QUIRKS.negativeRatesIgnored;
 * flyffentity.js:694-698).
 */
function applyMaxBonus(ctx: StatContext, base: number, parameter: string): number {
  const maxRate = 1 + ctx.total(parameter, true) / 100;
  const maxFlat = Math.max(0, ctx.total(parameter, false));

  return Math.floor((base + maxFlat) * maxRate);
}

/** flyffentity.js:682-699 */
export function computeHp(ctx: StatContext): number {
  const levelFactor = ctx.job.hp * ctx.level;
  const statScale = 1 + ctx.base('sta') * 0.01;
  const levelScale = levelFactor * 20;
  const baseHp = Math.floor(150 + statScale * levelScale);

  return applyMaxBonus(ctx, baseHp, 'maxhp');
}

/** flyffentity.js:704-720 */
export function computeMp(ctx: StatContext): number {
  const levelScale = ctx.level * 2;
  const statScale = ctx.base('int') * 9;
  const baseMp = Math.floor(22 + ctx.job.mp * (levelScale + statScale));

  return applyMaxBonus(ctx, baseMp, 'maxmp');
}

/** flyffentity.js:725-740 */
export function computeFp(ctx: StatContext): number {
  const levelScale = ctx.level * 2;
  const statScale = ctx.base('sta') * 7;
  const baseFp = Math.floor(ctx.job.fp * (levelScale + statScale));

  return applyMaxBonus(ctx, baseFp, 'maxfp');
}
