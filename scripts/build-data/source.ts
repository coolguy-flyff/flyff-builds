import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { z } from 'zod';

/**
 * Loose schemas for the Flyffulator `data-src` files. Only the fields the pipeline reads are
 * declared; zod strips everything else, which is the first half of the projection.
 */

const LocalizedName = z.object({ en: z.string() });

export const RawAbilitySchema = z.object({
  parameter: z.string().optional(),
  add: z.number().optional(),
  rate: z.boolean().optional(),
  addMax: z.number().optional(),
  skill: z.number().optional(),
  /** Skill-chance abilities: the mode(s) the proc applies in. */
  pve: z.boolean().optional(),
  pvp: z.boolean().optional(),
});

export const RawItemSchema = z.object({
  id: z.number(),
  name: LocalizedName,
  icon: z.string(),
  class: z.number().optional(),
  level: z.number(),
  category: z.string(),
  subcategory: z.string().optional(),
  rarity: z.string(),
  sex: z.string().optional(),
  minDefense: z.number().optional(),
  maxDefense: z.number().optional(),
  minAttack: z.number().optional(),
  maxAttack: z.number().optional(),
  attackSpeedValue: z.number().optional(),
  twoHanded: z.boolean().optional(),
  additionalSkillDamage: z.number().optional(),
  abilities: z.array(RawAbilitySchema).optional(),
  possibleRandomStats: z.array(RawAbilitySchema).optional(),
  upgradeLevels: z
    .array(
      z.object({
        upgradeLevel: z.number(),
        requiredLevel: z.number(),
        abilities: z.array(RawAbilitySchema),
      }),
    )
    .optional(),
  duration: z.number().optional(),
  minimumTargetItemLevel: z.number().optional(),
});

export const RawClassSchema = z.object({
  id: z.number(),
  name: LocalizedName,
  type: z.string(),
  parent: z.number().optional(),
  icon: z.string(),
  minLevel: z.number(),
  maxLevel: z.number(),
  hp: z.number(),
  mp: z.number(),
  fp: z.number(),
  defense: z.number(),
  magicDefenseStaFactor: z.number(),
  magicDefenseIntFactor: z.number(),
  attackSpeed: z.number(),
  block: z.number(),
  critical: z.number(),
  autoAttackFactors: z.record(z.string(), z.number()),
});

export const RawEquipSetSchema = z.object({
  id: z.number(),
  name: LocalizedName,
  parts: z.array(z.number()),
  bonus: z.array(z.object({ equipped: z.number(), ability: RawAbilitySchema })),
});

export const RawStatAwakeSchema = z.object({
  title: LocalizedName,
  minimumLevel: z.number(),
  abilities: z.array(RawAbilitySchema),
});

export const RawSkillAwakeCategorySchema = z.object({
  parameters: z.record(z.string(), z.record(z.string(), z.array(z.number()))).optional(),
  /** Skill-damage awakes: skill id → rarity → value list. */
  skills: z.record(z.string(), z.record(z.string(), z.array(z.number()))).optional(),
});

export const RawUpgradeBonusRowSchema = z.object({
  upgradeLevel: z.number(),
  weaponAttack: z.number(),
  helmetDefense: z.number(),
  suitDefense: z.number(),
  gauntletDefense: z.number(),
  bootsDefense: z.number(),
  shieldDefense: z.number(),
  setAbilities: z.array(RawAbilitySchema),
});

export const RawAchievementSchema = z.object({
  id: z.number(),
  name: LocalizedName,
  image: z.string(),
  abilities: z.array(RawAbilitySchema),
});

export const RawHousingNpcSchema = z.object({
  id: z.number(),
  name: LocalizedName,
  abilities: z.array(RawAbilitySchema),
});

export const RawPetSchema = z.object({
  petItemId: z.number(),
  parameter: z.string().optional(),
  rate: z.boolean().optional(),
  values: z.array(z.number()).optional(),
});

export const RawScalingParameterSchema = z.object({
  parameter: z.string(),
  stat: z.string().optional(),
  scale: z.number(),
  maximum: z.number().optional(),
  add: z.boolean().optional(),
  pve: z.boolean().optional(),
  pvp: z.boolean().optional(),
});

export const RawSynergySchema = z.object({
  parameter: z.string(),
  skill: z.number(),
  minLevel: z.number(),
  add: z.boolean().optional(),
  scale: z.number(),
  pve: z.boolean().optional(),
  pvp: z.boolean().optional(),
});

export const RawSkillSchema = z.object({
  id: z.number(),
  name: LocalizedName,
  icon: z.string(),
  levels: z
    .array(
      z.object({
        abilities: z.array(RawAbilitySchema).optional(),
        scalingParameters: z.array(RawScalingParameterSchema).optional(),
        synergies: z.array(RawSynergySchema).optional(),
      }),
    )
    .optional(),
});

const RawSourcesSchema = z.object({
  items: z.record(z.string(), RawItemSchema),
  classes: z.record(z.string(), RawClassSchema),
  equipSets: z.record(z.string(), RawEquipSetSchema),
  statAwakes: z.array(RawStatAwakeSchema),
  skillAwakes: z.record(z.string(), RawSkillAwakeCategorySchema),
  upgradeBonus: z.array(RawUpgradeBonusRowSchema),
  blessings: z.record(z.string(), z.array(RawAbilitySchema)),
  achievements: z.array(RawAchievementSchema),
  housingNpcs: z.record(z.string(), RawHousingNpcSchema),
  pets: z.record(z.string(), RawPetSchema),
  skills: z.record(z.string(), RawSkillSchema),
  statNames: z.record(z.string(), LocalizedName),
});

export type RawAbility = z.infer<typeof RawAbilitySchema>;
export type RawItem = z.infer<typeof RawItemSchema>;
export type RawClass = z.infer<typeof RawClassSchema>;
export type RawEquipSet = z.infer<typeof RawEquipSetSchema>;
export type RawStatAwake = z.infer<typeof RawStatAwakeSchema>;
export type RawSkillAwakeCategory = z.infer<typeof RawSkillAwakeCategorySchema>;
export type RawUpgradeBonusRow = z.infer<typeof RawUpgradeBonusRowSchema>;
export type RawAchievement = z.infer<typeof RawAchievementSchema>;
export type RawHousingNpc = z.infer<typeof RawHousingNpcSchema>;
export type RawPet = z.infer<typeof RawPetSchema>;
export type RawSkill = z.infer<typeof RawSkillSchema>;
export type RawSources = z.infer<typeof RawSourcesSchema>;

/** Source table → file name inside the Flyffulator `data-src` directory. */
export const SOURCE_FILES = {
  items: 'Items.json',
  classes: 'Classes.json',
  equipSets: 'EquipSets.json',
  statAwakes: 'StatAwakes.json',
  skillAwakes: 'SkillAwakes.json',
  upgradeBonus: 'UpgradeBonus.json',
  blessings: 'Blessings.json',
  achievements: 'Achievements.json',
  housingNpcs: 'HousingNPCs.json',
  pets: 'Pets.json',
  skills: 'Skills.json',
  statNames: 'StatNames.json',
} as const satisfies Record<keyof RawSources, string>;

export interface SourceDigest {
  sha256: string;
  bytes: number;
}

export interface LoadedSources {
  sources: RawSources;
  digests: Record<string, SourceDigest>;
}

export class SourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SourceError';
  }
}

function readSourceFile(dir: string, file: string): { text: string; digest: SourceDigest } {
  const path = join(dir, file);
  let text: string;

  try {
    text = readFileSync(path, 'utf8');
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new SourceError(`Cannot read source file ${path}: ${reason}`);
  }

  const bytes = Buffer.byteLength(text, 'utf8');
  const sha256 = createHash('sha256').update(text).digest('hex');

  return { text, digest: { sha256, bytes } };
}

/**
 * Reads and validates every Flyffulator source file. Throws {@link SourceError} with the file and
 * the first schema issue when a file is missing or has drifted from the shape we understand.
 */
export function loadSources(dir: string): LoadedSources {
  const rawByTable: Record<string, unknown> = {};
  const digests: Record<string, SourceDigest> = {};

  for (const [table, file] of Object.entries(SOURCE_FILES)) {
    const { text, digest } = readSourceFile(dir, file);
    digests[file] = digest;

    try {
      rawByTable[table] = JSON.parse(text) as unknown;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new SourceError(`Source file ${file} is not valid JSON: ${reason}`);
    }
  }

  const parsed = RawSourcesSchema.safeParse(rawByTable);

  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const location = first === undefined ? 'unknown' : first.path.join('.');
    const message = first === undefined ? 'unknown issue' : first.message;
    throw new SourceError(
      `Source data does not match the expected shape at ${location}: ${message}`,
    );
  }

  return { sources: parsed.data, digests };
}
