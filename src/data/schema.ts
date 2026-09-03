import { z } from 'zod';

/**
 * Schemas for the slim game-data tables produced by `scripts/build-data` and bundled under
 * `src/data/generated`. They are the single source of truth for the data shapes: the pipeline
 * validates its output against them, and the app validates the bundled JSON on load.
 */

export const RARITIES = ['common', 'uncommon', 'rare', 'veryrare', 'unique', 'ultimate'] as const;
export const STAT_KEYS = ['str', 'sta', 'dex', 'int'] as const;
export const WEAPON_SUBCATEGORIES = [
  'sword',
  'axe',
  'staff',
  'stick',
  'knuckle',
  'yoyo',
  'bow',
  'wand',
] as const;
export const SEXES = ['male', 'female'] as const;
export const PIERCE_TARGETS = ['suit', 'weapon'] as const;
export const HOUSING_GROUPS = ['personal', 'guild'] as const;
export const CLASS_TYPES = ['beginner', 'expert', 'professional', 'specialist'] as const;
export const ARMOR_PARTS = ['helmet', 'suit', 'gauntlet', 'boots'] as const;
export const EARRING_VARIANTS = ['plug', 'demol'] as const;
export const NECKLACE_VARIANTS = ['gore', 'mental', 'peision'] as const;
export const ACCESSORY_SLOTS = ['ring', 'earring', 'necklace'] as const;

const nonNegativeInt = z.number().int().nonnegative();

export const AbilitySchema = z.object({
  parameter: z.string().min(1),
  add: z.number(),
  rate: z.boolean(),
  addMax: z.number().optional(),
  skill: nonNegativeInt.optional(),
});

export const UpgradeLevelSchema = z.object({
  upgradeLevel: nonNegativeInt,
  requiredLevel: nonNegativeInt,
  abilities: z.array(AbilitySchema),
});

export const SlimItemSchema = z.object({
  id: nonNegativeInt,
  name: z.string().min(1),
  icon: z.string().min(1),
  class: nonNegativeInt.optional(),
  level: nonNegativeInt,
  category: z.string().min(1),
  subcategory: z.string().optional(),
  rarity: z.enum(RARITIES),
  sex: z.enum(SEXES).optional(),
  minDefense: z.number().optional(),
  maxDefense: z.number().optional(),
  minAttack: z.number().optional(),
  maxAttack: z.number().optional(),
  attackSpeedValue: z.number().optional(),
  twoHanded: z.boolean().optional(),
  additionalSkillDamage: z.number().optional(),
  abilities: z.array(AbilitySchema).optional(),
  possibleRandomStats: z.array(AbilitySchema).optional(),
  upgradeLevels: z.array(UpgradeLevelSchema).optional(),
  duration: z.number().optional(),
  minimumTargetItemLevel: nonNegativeInt.optional(),
  pierceTarget: z.enum(PIERCE_TARGETS).optional(),
});

export const SlimClassSchema = z.object({
  id: nonNegativeInt,
  name: z.string().min(1),
  type: z.enum(CLASS_TYPES),
  parent: nonNegativeInt.optional(),
  icon: z.string().min(1),
  minLevel: nonNegativeInt,
  maxLevel: nonNegativeInt,
  hp: z.number(),
  mp: z.number(),
  fp: z.number(),
  defense: z.number(),
  magicDefenseStaFactor: z.number(),
  magicDefenseIntFactor: z.number(),
  attackSpeed: z.number(),
  block: z.number(),
  critical: z.number(),
  autoAttackFactors: z.record(z.enum(WEAPON_SUBCATEGORIES), z.number()),
});

export const SetBonusSchema = z.object({
  equipped: nonNegativeInt,
  ability: AbilitySchema,
});

export const ArmorSetSchema = z.object({
  id: nonNegativeInt,
  name: z.string().min(1),
  jobId: nonNegativeInt,
  sex: z.enum(SEXES),
  level: nonNegativeInt,
  parts: z.record(z.enum(ARMOR_PARTS), nonNegativeInt),
  bonus: z.array(SetBonusSchema),
});

export const AccessorySetSchema = z.object({
  id: nonNegativeInt,
  name: z.string().min(1),
  ring: nonNegativeInt,
  earrings: z.record(z.enum(EARRING_VARIANTS), nonNegativeInt),
  necklaces: z.object({
    gore: nonNegativeInt,
    mental: nonNegativeInt,
    peision: nonNegativeInt.optional(),
  }),
  bonus: z.array(SetBonusSchema),
});

/** One item of an accessory line: "Speedo +3" is the tier at upgrade 3 (a lone "Meteofy" is upgrade 0). */
export const AccessoryLineTierSchema = z.object({
  upgrade: nonNegativeInt,
  itemId: nonNegativeInt,
});

/**
 * A standalone accessory line — the Clockworks "CW jewels" (Speedo +1…+5, Strente +1…+5,
 * Meteofy, …) that can replace single pieces of an accessory set. Each "+N" is its own item in
 * the game data, so a line is the ordered list of those items; `id` is the lowest tier's item id.
 */
export const AccessoryLineSchema = z.object({
  id: nonNegativeInt,
  name: z.string().min(1),
  slot: z.enum(ACCESSORY_SLOTS),
  icon: z.string().min(1),
  /** Ascending, contiguous upgrades. */
  tiers: z.array(AccessoryLineTierSchema).min(1),
});

export const StatAwakeDefSchema = z.object({
  title: z.string().min(1),
  minimumLevel: nonNegativeInt,
  abilities: z.array(
    z.object({
      parameter: z.enum(STAT_KEYS),
      add: z.number().int().positive(),
    }),
  ),
});

export const SkillAwakeTableSchema = z.record(
  z.string(),
  z.record(z.string(), z.partialRecord(z.enum(RARITIES), z.array(z.number()))),
);

/**
 * Name + icon of a skill referenced by name only: skill-damage awakes (`skill:<id>` parameters in
 * the skill-awake table) and skill-chance item abilities (`skillchance:<id>` parameters). Damage
 * awakes have no stat effect yet; they are stored for future work.
 */
export const AwakeSkillSchema = z.object({
  id: nonNegativeInt,
  name: z.string().min(1),
  icon: z.string().min(1),
});

export const UpgradeBonusRowSchema = z.object({
  upgradeLevel: nonNegativeInt,
  weaponAttack: z.number(),
  helmetDefense: z.number(),
  suitDefense: z.number(),
  gauntletDefense: z.number(),
  bootsDefense: z.number(),
  shieldDefense: z.number(),
  setAbilities: z.array(AbilitySchema),
});

export const BlessingTableSchema = z.record(
  z.string(),
  z.object({
    rate: z.boolean(),
    values: z.array(z.number()),
  }),
);

export const AchievementSchema = z.object({
  id: nonNegativeInt,
  name: z.string().min(1),
  image: z.string().min(1),
  abilities: z.array(AbilitySchema),
});

export const HousingNpcSchema = z.object({
  id: nonNegativeInt,
  name: z.string().min(1),
  shortName: z.string().min(1),
  group: z.enum(HOUSING_GROUPS),
  abilities: z.array(AbilitySchema),
});

/**
 * The pet's grace skill: a short buff the pet casts on demand (Pets.json tier data + Skills.json).
 * `levels[n − 1]` holds the abilities at grace level n, which equals the number of raised tiers.
 */
export const PetGraceSchema = z.object({
  skillId: nonNegativeInt,
  name: z.string().min(1),
  icon: z.string().min(1),
  durationSeconds: nonNegativeInt,
  cooldownSeconds: nonNegativeInt,
  energy: nonNegativeInt,
  levels: z.array(z.array(AbilitySchema)).min(1),
});

export const PetDefSchema = z.object({
  petItemId: nonNegativeInt,
  name: z.string().min(1),
  parameter: z.string().min(1),
  rate: z.boolean(),
  values: z.array(z.number()).length(9),
  grace: PetGraceSchema.optional(),
});

export const ScalingParameterSchema = z.object({
  parameter: z.string().min(1),
  stat: z.enum([...STAT_KEYS, 'hp']).optional(),
  scale: z.number(),
  maximum: z.number().optional(),
  add: z.boolean(),
  pve: z.boolean(),
  pvp: z.boolean(),
});

export const SynergySchema = z.object({
  parameter: z.string().min(1),
  skill: nonNegativeInt,
  /** Level count of `skill`, so "synergy source maxed" needs no lookup at runtime. */
  sourceLevelCount: z.number().int().positive(),
  minLevel: nonNegativeInt,
  add: z.boolean(),
  scale: z.number(),
  pve: z.boolean(),
  pvp: z.boolean(),
});

export const SlimSkillSchema = z.object({
  id: nonNegativeInt,
  name: z.string().min(1),
  icon: z.string().min(1),
  levelCount: z.number().int().positive(),
  max: z.object({
    abilities: z.array(AbilitySchema),
    scalingParameters: z.array(ScalingParameterSchema),
    synergies: z.array(SynergySchema),
  }),
});

/** `classBuff` targets others too (party / single), `selfBuff` only the caster. */
export const CLASS_SKILL_KINDS = ['classBuff', 'selfBuff', 'passive'] as const;

/**
 * A buff or passive of a third-job class chain that grants stats (plan feedback 2026-09-03):
 * everything the app needs to list it under its job and to apply it at max level.
 */
export const ClassSkillSchema = SlimSkillSchema.extend({
  /** The class that teaches the skill (any class of the chain, Vagrant included). */
  classId: nonNegativeInt,
  /** Character level required to learn it; orders the rows within a class. */
  level: nonNegativeInt,
  kind: z.enum(CLASS_SKILL_KINDS),
  /** Master variations share the id of their base skill and are mutually exclusive. */
  familyId: nonNegativeInt,
  /** Always active once learned (the data encodes permanent passives as one-hour buffs). */
  permanent: z.boolean(),
  durationSeconds: z.number().optional(),
});

export const ManifestSchema = z.object({
  generatedAt: z.string().min(1),
  generator: z.string().min(1),
  sourceDir: z.string().min(1),
  /** api.flyff.com /version/data at scrape time; shown in the app footer. */
  dataVersion: nonNegativeInt.optional(),
  sources: z.record(z.string(), z.object({ sha256: z.string().length(64), bytes: nonNegativeInt })),
  counts: z.record(z.string(), nonNegativeInt),
});

export const GeneratedDataSchema = z.object({
  items: z.array(SlimItemSchema),
  classes: z.array(SlimClassSchema),
  armorSets: z.array(ArmorSetSchema),
  accessorySets: z.array(AccessorySetSchema),
  accessoryLines: z.array(AccessoryLineSchema),
  statAwakes: z.array(StatAwakeDefSchema),
  skillAwakes: SkillAwakeTableSchema,
  awakeSkills: z.array(AwakeSkillSchema),
  upgradeBonus: z.array(UpgradeBonusRowSchema),
  blessings: BlessingTableSchema,
  achievements: z.array(AchievementSchema),
  housingNpcs: z.array(HousingNpcSchema),
  pets: z.array(PetDefSchema),
  skills: z.array(SlimSkillSchema),
  classSkills: z.array(ClassSkillSchema),
  statNames: z.record(z.string(), z.string()),
  manifest: ManifestSchema,
});

/** Table name → file name under src/data/generated. */
export const GENERATED_TABLE_FILES = {
  items: 'items.json',
  classes: 'classes.json',
  armorSets: 'armorSets.json',
  accessorySets: 'accessorySets.json',
  accessoryLines: 'accessoryLines.json',
  statAwakes: 'statAwakes.json',
  skillAwakes: 'skillAwakes.json',
  awakeSkills: 'awakeSkills.json',
  upgradeBonus: 'upgradeBonus.json',
  blessings: 'blessings.json',
  achievements: 'achievements.json',
  housingNpcs: 'housingNpcs.json',
  pets: 'pets.json',
  skills: 'skills.json',
  classSkills: 'classSkills.json',
  statNames: 'statNames.json',
  manifest: 'manifest.json',
} as const satisfies Record<keyof z.infer<typeof GeneratedDataSchema>, string>;

export type Rarity = (typeof RARITIES)[number];
export type StatKey = (typeof STAT_KEYS)[number];
export type WeaponSubcategory = (typeof WEAPON_SUBCATEGORIES)[number];
export type Sex = (typeof SEXES)[number];
export type PierceTarget = (typeof PIERCE_TARGETS)[number];
export type HousingGroup = (typeof HOUSING_GROUPS)[number];
export type ArmorPart = (typeof ARMOR_PARTS)[number];
export type EarringVariant = (typeof EARRING_VARIANTS)[number];
export type NecklaceVariant = (typeof NECKLACE_VARIANTS)[number];
export type AccessorySlot = (typeof ACCESSORY_SLOTS)[number];

export type Ability = z.infer<typeof AbilitySchema>;
export type UpgradeLevel = z.infer<typeof UpgradeLevelSchema>;
export type SlimItem = z.infer<typeof SlimItemSchema>;
export type SlimClass = z.infer<typeof SlimClassSchema>;
export type SetBonus = z.infer<typeof SetBonusSchema>;
export type ArmorSet = z.infer<typeof ArmorSetSchema>;
export type AccessorySet = z.infer<typeof AccessorySetSchema>;
export type AccessoryLineTier = z.infer<typeof AccessoryLineTierSchema>;
export type AccessoryLine = z.infer<typeof AccessoryLineSchema>;
export type StatAwakeDef = z.infer<typeof StatAwakeDefSchema>;
export type SkillAwakeTable = z.infer<typeof SkillAwakeTableSchema>;
export type AwakeSkill = z.infer<typeof AwakeSkillSchema>;
export type UpgradeBonusRow = z.infer<typeof UpgradeBonusRowSchema>;
export type BlessingTable = z.infer<typeof BlessingTableSchema>;
export type Achievement = z.infer<typeof AchievementSchema>;
export type HousingNpc = z.infer<typeof HousingNpcSchema>;
export type PetGrace = z.infer<typeof PetGraceSchema>;
export type PetDef = z.infer<typeof PetDefSchema>;
export type ScalingParameter = z.infer<typeof ScalingParameterSchema>;
export type Synergy = z.infer<typeof SynergySchema>;
export type SlimSkill = z.infer<typeof SlimSkillSchema>;
export type ClassSkillKind = (typeof CLASS_SKILL_KINDS)[number];
export type ClassSkill = z.infer<typeof ClassSkillSchema>;
export type Manifest = z.infer<typeof ManifestSchema>;
export type GeneratedData = z.infer<typeof GeneratedDataSchema>;
export type GeneratedTableName = keyof GeneratedData;
