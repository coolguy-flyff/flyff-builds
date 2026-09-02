import type { StatContext } from './context';

/** The factors behind a max HP / MP / FP value, for the results tooltip. */
export interface VitalBreakdown {
  /** From class, level and the base stat (STA for HP/FP, INT for MP). */
  readonly base: number;
  /** Flat max-HP/MP/FP bonuses; clamped at zero as in-game. */
  readonly flat: number;
  /** The % bonus itself. */
  readonly rate: number;
  /** What the % bonus adds on top of base + flat. */
  readonly rateGain: number;
  readonly total: number;
}

/**
 * Flat bonuses clamp at zero, rates do not (FLYFFULATOR_QUIRKS.negativeRatesIgnored;
 * flyffentity.js:694-698).
 */
function vitalBreakdown(ctx: StatContext, base: number, parameter: string): VitalBreakdown {
  const rate = ctx.total(parameter, true);
  const flat = Math.max(0, ctx.total(parameter, false));
  const total = Math.floor((base + flat) * (1 + rate / 100));

  return { base, flat, rate, rateGain: total - (base + flat), total };
}

/** flyffentity.js:682-699 */
export function computeHpBreakdown(ctx: StatContext): VitalBreakdown {
  const levelFactor = ctx.job.hp * ctx.level;
  const statScale = 1 + ctx.base('sta') * 0.01;
  const levelScale = levelFactor * 20;
  const baseHp = Math.floor(150 + statScale * levelScale);

  return vitalBreakdown(ctx, baseHp, 'maxhp');
}

/** flyffentity.js:704-720 */
export function computeMpBreakdown(ctx: StatContext): VitalBreakdown {
  const levelScale = ctx.level * 2;
  const statScale = ctx.base('int') * 9;
  const baseMp = Math.floor(22 + ctx.job.mp * (levelScale + statScale));

  return vitalBreakdown(ctx, baseMp, 'maxmp');
}

/** flyffentity.js:725-740 */
export function computeFpBreakdown(ctx: StatContext): VitalBreakdown {
  const levelScale = ctx.level * 2;
  const statScale = ctx.base('sta') * 7;
  const baseFp = Math.floor(ctx.job.fp * (levelScale + statScale));

  return vitalBreakdown(ctx, baseFp, 'maxfp');
}

export function computeHp(ctx: StatContext): number {
  return computeHpBreakdown(ctx).total;
}

export function computeMp(ctx: StatContext): number {
  return computeMpBreakdown(ctx).total;
}

export function computeFp(ctx: StatContext): number {
  return computeFpBreakdown(ctx).total;
}
