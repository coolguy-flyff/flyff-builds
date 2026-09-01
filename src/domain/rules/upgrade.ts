import type { GameData, SlimItem, UpgradeBonusRow } from '@/data';

/** Ultimate items count as ten levels higher on the upgrade-bonus table (flyffitemelem.js:221-223). */
export function effectiveUpgradeLevel(item: SlimItem, upgrade: number): number {
  return upgrade + (item.rarity === 'ultimate' ? 10 : 0);
}

export function upgradeBonusRow(
  data: GameData,
  effectiveLevel: number,
): UpgradeBonusRow | undefined {
  return data.upgradeBonus.find((row) => row.upgradeLevel === effectiveLevel);
}

type BonusColumn = keyof Pick<
  UpgradeBonusRow,
  | 'weaponAttack'
  | 'helmetDefense'
  | 'suitDefense'
  | 'gauntletDefense'
  | 'bootsDefense'
  | 'shieldDefense'
>;

const DEFENSE_COLUMNS: Readonly<Record<string, BonusColumn>> = {
  helmet: 'helmetDefense',
  suit: 'suitDefense',
  gauntlet: 'gauntletDefense',
  boots: 'bootsDefense',
  shield: 'shieldDefense',
};

function bonusColumn(item: SlimItem): BonusColumn {
  return DEFENSE_COLUMNS[item.subcategory ?? ''] ?? 'weaponAttack';
}

/** Attack/defense multiplier for a weapon or armor piece (flyffitemelem.js:214-250). */
export function upgradeMultiplier(data: GameData, item: SlimItem, upgrade: number): number {
  let multiplier = 1;

  if (item.category === 'weapon' || item.category === 'armor') {
    const level = effectiveUpgradeLevel(item, upgrade);
    const row = level > 0 ? upgradeBonusRow(data, level) : undefined;

    if (row !== undefined) {
      multiplier = 1 + row[bonusColumn(item)] / 100;
    }
  }

  return multiplier;
}

/** Flat bonus added after the multiplier: `floor(level^1.5)` (flyffentity.js:1042-1046, 1586-1590). */
export function upgradeFlatBonus(effectiveLevel: number): number {
  return effectiveLevel > 0 ? Math.floor(Math.pow(effectiveLevel, 1.5)) : 0;
}
