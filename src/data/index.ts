import { GeneratedDataSchema, type GeneratedData } from './schema';
import { createGameData, type GameData } from './gameData';

import accessorySets from './generated/accessorySets.json';
import achievements from './generated/achievements.json';
import armorSets from './generated/armorSets.json';
import awakeSkills from './generated/awakeSkills.json';
import blessings from './generated/blessings.json';
import classes from './generated/classes.json';
import housingNpcs from './generated/housingNpcs.json';
import items from './generated/items.json';
import manifest from './generated/manifest.json';
import pets from './generated/pets.json';
import skillAwakes from './generated/skillAwakes.json';
import skills from './generated/skills.json';
import statAwakes from './generated/statAwakes.json';
import statNames from './generated/statNames.json';
import upgradeBonus from './generated/upgradeBonus.json';

/**
 * Validates the bundled tables once and builds the indexed {@link GameData}. Validation is cheap
 * (a few milliseconds for ~1,300 items) and guarantees every downstream consumer sees the shapes
 * declared in `schema.ts`, so it runs in production too.
 */
export function loadBundledGameData(): GameData {
  const raw: GeneratedData = GeneratedDataSchema.parse({
    items,
    classes,
    armorSets,
    accessorySets,
    statAwakes,
    skillAwakes,
    awakeSkills,
    upgradeBonus,
    blessings,
    achievements,
    housingNpcs,
    pets,
    skills,
    statNames,
    manifest,
  });

  return createGameData(raw);
}

export type { GameData } from './gameData';
export * from './gameData';
export * from './schema';
export * from './constants';
