import { RARITIES, type GameData, type Rarity, type SlimItem } from '@/data';

export interface SkillAwakeOption {
  readonly parameter: string;
  readonly values: readonly number[];
}

function awakeCategories(item: SlimItem): string[] {
  const categories: string[] = [];

  if (item.subcategory !== undefined) {
    categories.push(item.subcategory);
  }

  if (item.subcategory === 'sword' || item.subcategory === 'axe') {
    categories.push('swordoraxe');
  } else if (item.subcategory === 'wand' || item.subcategory === 'staff') {
    categories.push('wandorstaff');
  }

  return categories;
}

/** The item's own rarity when listed, otherwise the highest listed rarity (itemedit.jsx:109-128). */
function valuesForRarity(
  byRarity: Partial<Record<Rarity, number[]>>,
  rarity: Rarity,
): readonly number[] {
  let values = byRarity[rarity];

  if (values === undefined) {
    for (const candidate of [...RARITIES].reverse()) {
      const listed = byRarity[candidate];

      if (listed !== undefined) {
        values = listed;
        break;
      }
    }
  }

  return values ?? [];
}

/** Stat-type skill awakes available to an item (skill-target awakes have no stat effect). */
export function skillAwakeOptions(data: GameData, item: SlimItem): readonly SkillAwakeOption[] {
  const options: SkillAwakeOption[] = [];

  for (const category of awakeCategories(item)) {
    const parameters = data.skillAwakes[category];

    if (parameters === undefined) {
      continue;
    }

    for (const [parameter, byRarity] of Object.entries(parameters)) {
      const values = valuesForRarity(byRarity, item.rarity);

      if (values.length > 0) {
        options.push({ parameter, values });
      }
    }
  }

  return options;
}

export function isValidSkillAwake(
  data: GameData,
  item: SlimItem,
  awake: { parameter: string; value: number },
): boolean {
  const option = skillAwakeOptions(data, item).find((entry) => entry.parameter === awake.parameter);

  return option?.values.includes(awake.value) ?? false;
}
