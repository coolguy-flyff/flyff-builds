import { WEAPON_SUBCATEGORIES, type SlimClass, type StatKey, type WeaponSubcategory } from '@/data';

import { effectiveUpgradeLevel, upgradeFlatBonus, upgradeMultiplier } from '../../rules';
import type { StatContext } from './context';
import { computeFp } from './vitals';

interface WeaponAttackFormula {
  readonly levelFactor: number;
  readonly stat: StatKey;
  readonly statOffset: number;
  /** Bows add a fraction of STR on top of the DEX scaling. */
  readonly strFactor: number;
}

/** Per-weapon-type scaling (flyffentity.js:1069-1101). */
const WEAPON_ATTACK_FORMULAS: Readonly<Record<string, WeaponAttackFormula>> = {
  sword: { levelFactor: 1.1, stat: 'str', statOffset: 12, strFactor: 0 },
  yoyo: { levelFactor: 1.1, stat: 'str', statOffset: 12, strFactor: 0 },
  axe: { levelFactor: 1.2, stat: 'str', statOffset: 12, strFactor: 0 },
  staff: { levelFactor: 1.1, stat: 'str', statOffset: 10, strFactor: 0 },
  hand: { levelFactor: 1.1, stat: 'str', statOffset: 10, strFactor: 0 },
  stick: { levelFactor: 1.3, stat: 'str', statOffset: 10, strFactor: 0 },
  knuckle: { levelFactor: 1.2, stat: 'str', statOffset: 10, strFactor: 0 },
  wand: { levelFactor: 1.2, stat: 'int', statOffset: 10, strFactor: 0 },
  bow: { levelFactor: 0.91, stat: 'dex', statOffset: 14, strFactor: 0.14 },
};

function isWeaponSubcategory(subcategory: string): subcategory is WeaponSubcategory {
  return (WEAPON_SUBCATEGORIES as readonly string[]).includes(subcategory);
}

/** Bare hands scale by 1; real weapon types use the job's factor (flyffentity.js:1104). */
function autoAttackFactor(job: SlimClass, subcategory: string): number {
  return isWeaponSubcategory(subcategory) ? job.autoAttackFactors[subcategory] : 1;
}

/** Attack granted by wielding a weapon of `subcategory` (flyffentity.js:1064-1108). */
export function computeWeaponAttack(ctx: StatContext, subcategory: string): number {
  const formula = WEAPON_ATTACK_FORMULAS[subcategory];
  let levelFactor = 0;
  let statValue = 0;
  let addValue = 0;

  if (formula !== undefined) {
    levelFactor = formula.levelFactor;
    statValue = ctx.base(formula.stat) - formula.statOffset;
    addValue = formula.strFactor * ctx.base('str');
  }

  const plusAttack = ctx.total(`${subcategory}attack`, false);
  const statAttack = statValue * autoAttackFactor(ctx.job, subcategory);
  const levelAttack = ctx.level * levelFactor;

  return plusAttack + Math.floor(statAttack + levelAttack + addValue);
}

export interface HitRange {
  readonly min: number;
  readonly max: number;
}

/** Mainhand auto-attack hit range (flyffentity.js:1012-1058). */
export function computeHitMinMax(ctx: StatContext): HitRange {
  const { item, upgrade } = ctx.mainhand;
  let min = (item.minAttack ?? 0) * 2;
  let max = (item.maxAttack ?? 0) * 2;

  min += ctx.total('minability', false);
  max += ctx.total('maxability', false);

  const plus = computeWeaponAttack(ctx, item.subcategory ?? '') + ctx.total('damage', false);

  min += plus;
  max += plus;

  const upgradeFactor = upgradeMultiplier(ctx.data, item, upgrade);

  min = Math.floor(min * upgradeFactor);
  max = Math.floor(max * upgradeFactor);

  const upgradeBonus = upgradeFlatBonus(effectiveUpgradeLevel(item, upgrade));

  min += upgradeBonus;
  max += upgradeBonus;

  const spiritStrike = ctx.total('spiritstrike', true);

  if (spiritStrike > 0) {
    const bonus = Math.floor((spiritStrike * computeFp(ctx)) / 100);

    min += bonus;
    max += bonus;
  }

  return { min, max };
}

/** The character-window attack value (flyffentity.js:803-822). */
export function computeAttack(ctx: StatContext): number {
  const hit = computeHitMinMax(ctx);
  let average = (hit.min + hit.max) / 2;

  if (ctx.hasUpcutStone) {
    average = Math.floor(average * 1.2);
  }

  const extraRate = ctx.total('attack', true);

  if (extraRate > 0) {
    average += (average * extraRate) / 100;
  }

  average += ctx.total('attack', false);

  return Math.floor(Math.max(average, 0));
}
