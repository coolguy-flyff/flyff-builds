import { z } from 'zod';

import { EARRING_VARIANTS, NECKLACE_VARIANTS, STAT_KEYS } from '@/data/schema';

/**
 * The user's build state: character, stat pages, the six gear lists, global buffs and gear swaps.
 * This schema is the structural contract for persistence (localStorage envelopes), snapshots and
 * share-code decoding; semantic validation against game data lives in `validate.ts`.
 */

export const BUILD_SCHEMA_VERSION = 1 as const;

export const LIMITS = {
  statPages: 16,
  entriesPerList: 32,
  gearSwaps: 16,
  premiumItems: 32,
  nameLength: 32,
  blessingLines: 10,
  randomStatLines: 4,
} as const;

/** Highest overall awake total an armor set can carry (4 pieces × +4 single awakes). */
export const MAX_SET_AWAKE_TOTAL = 16;

export const MIN_BASE_STAT = 15;
export const MAX_UPGRADE_LEVEL = 10;
export const MAX_FASHION_SPEED_PERCENT = 10;

const entryId = z.number().int().positive();
const gameId = z.number().int().nonnegative();
const upgrade = z.number().int().min(0).max(MAX_UPGRADE_LEVEL);
const baseStat = z.number().int().min(MIN_BASE_STAT);
const customName = z.string().max(LIMITS.nameLength).optional();

export const StatAwakeLineSchema = z.object({
  stat: z.enum(STAT_KEYS),
  value: z.number().int().min(1).max(4),
});

/** Two awake lines per item; `null` = empty line. Valid combinations come from StatAwakes.json. */
export const StatAwakeSchema = z.tuple([
  StatAwakeLineSchema.nullable(),
  StatAwakeLineSchema.nullable(),
]);

export const SetStatAwakeLineSchema = z.object({
  stat: z.enum(STAT_KEYS),
  value: z.number().int().min(1).max(MAX_SET_AWAKE_TOTAL),
});

/**
 * An equipment set's awake as overall totals across its four pieces (plan change 2026-09-01): the
 * per-piece distribution doesn't matter, only the applied bonus. Reachable pairs come from
 * `domain/rules/statAwake.ts`.
 */
export const SetStatAwakeSchema = z.tuple([
  SetStatAwakeLineSchema.nullable(),
  SetStatAwakeLineSchema.nullable(),
]);

export const SkillAwakeSchema = z.object({
  parameter: z.string().min(1),
  value: z.number(),
});

/** Piercing cards and ultimate jewels are multisets: the game only sums their abilities. */
export const StackSchema = z.object({
  itemId: gameId,
  count: z.number().int().min(1),
});

export const RandomStatLineSchema = z.object({
  parameter: z.string().min(1),
  value: z.number(),
});

export const StatPageSchema = z.object({
  id: entryId,
  customName,
  str: baseStat,
  sta: baseStat,
  dex: baseStat,
  int: baseStat,
});

export const EquipmentSetEntrySchema = z.object({
  id: entryId,
  customName,
  setId: gameId.nullable(),
  upgrade,
  statAwake: SetStatAwakeSchema,
  suitCards: z.array(StackSchema),
});

export const WeaponEntrySchema = z.object({
  id: entryId,
  customName,
  itemId: gameId.nullable(),
  upgrade,
  statAwake: StatAwakeSchema,
  skillAwake: SkillAwakeSchema.nullable(),
  cards: z.array(StackSchema),
  jewels: z.array(StackSchema),
  /** One value per ranged ability of the item (abilities with `addMax`), in ability order. */
  statRanges: z.array(z.number()),
  /** Ultimate random-stat lines; lines 3/4 stay stored while locked by the upgrade level. */
  randomStats: z.array(RandomStatLineSchema.nullable()).max(LIMITS.randomStatLines),
});

export const ShieldEntrySchema = z.object({
  id: entryId,
  customName,
  itemId: gameId.nullable(),
  upgrade,
  statAwake: StatAwakeSchema,
  skillAwake: SkillAwakeSchema.nullable(),
  cards: z.array(StackSchema),
});

export const AccessoryUpgradesSchema = z.object({
  ring1: upgrade,
  ring2: upgrade,
  earring1: upgrade,
  earring2: upgrade,
  necklace: upgrade,
});

export const AccessorySetEntrySchema = z.object({
  id: entryId,
  customName,
  setId: gameId.nullable(),
  earring1: z.enum(EARRING_VARIANTS),
  earring2: z.enum(EARRING_VARIANTS),
  necklace: z.enum(NECKLACE_VARIANTS),
  upgrades: AccessoryUpgradesSchema,
});

export const BlessingLineSchema = z.object({
  parameter: z.string().min(1),
  total: z.number(),
});

export const FashionSetEntrySchema = z.object({
  id: entryId,
  customName,
  speedPercent: z.number().int().min(0).max(MAX_FASHION_SPEED_PERCENT),
  blessings: z.array(BlessingLineSchema).max(LIMITS.blessingLines),
  cloakItemId: gameId.nullable(),
});

export const PetEntrySchema = z.object({
  id: entryId,
  customName,
  petItemId: gameId.nullable(),
  total: z.number(),
});

export const RmBuffsSchema = z.object({
  enabled: z.boolean(),
  /** Individual RM buffs switched off while the master switch is on. */
  excludedSkillIds: z.array(gameId),
});

export const BuffsStateSchema = z.object({
  rmBuffs: RmBuffsSchema,
  premiumItemIds: z.array(gameId).max(LIMITS.premiumItems),
  personalNpcIds: z.array(gameId),
  coupleNpcIds: z.array(gameId),
  guildNpcIds: z.array(gameId),
  achievementId: gameId.nullable(),
});

export const OffhandSchema = z
  .discriminatedUnion('kind', [
    z.object({ kind: z.literal('shield'), id: entryId }),
    z.object({ kind: z.literal('weapon'), id: entryId }),
  ])
  .nullable();

export const GearSwapSchema = z.object({
  id: entryId,
  customName,
  includeInResults: z.boolean(),
  statPageId: entryId,
  equipmentSetId: entryId.nullable(),
  accessorySetId: entryId.nullable(),
  weaponId: entryId.nullable(),
  offhand: OffhandSchema,
  fashionSetId: entryId.nullable(),
  petId: entryId.nullable(),
  maskItemId: gameId.nullable(),
});

export const CharacterSchema = z.object({
  jobId: gameId,
  level: z.number().int().min(1).max(300),
});

export const BuildStateSchema = z.object({
  schemaVersion: z.literal(BUILD_SCHEMA_VERSION),
  nextId: entryId,
  character: CharacterSchema,
  statPages: z.array(StatPageSchema).min(1).max(LIMITS.statPages),
  equipmentSets: z.array(EquipmentSetEntrySchema).max(LIMITS.entriesPerList),
  weapons: z.array(WeaponEntrySchema).max(LIMITS.entriesPerList),
  shields: z.array(ShieldEntrySchema).max(LIMITS.entriesPerList),
  accessorySets: z.array(AccessorySetEntrySchema).max(LIMITS.entriesPerList),
  fashionSets: z.array(FashionSetEntrySchema).max(LIMITS.entriesPerList),
  pets: z.array(PetEntrySchema).max(LIMITS.entriesPerList),
  buffs: BuffsStateSchema,
  gearSwaps: z.array(GearSwapSchema).min(1).max(LIMITS.gearSwaps),
});

/** Ids are per-build monotonic integers (`nextId`); share codes never carry them. */
export type EntryId = number;

export type StatAwakeLine = z.infer<typeof StatAwakeLineSchema>;
export type StatAwake = z.infer<typeof StatAwakeSchema>;
export type SetStatAwakeLine = z.infer<typeof SetStatAwakeLineSchema>;
export type SetStatAwake = z.infer<typeof SetStatAwakeSchema>;
export type SkillAwake = z.infer<typeof SkillAwakeSchema>;
export type Stack = z.infer<typeof StackSchema>;
export type RandomStatLine = z.infer<typeof RandomStatLineSchema>;
export type StatPage = z.infer<typeof StatPageSchema>;
export type EquipmentSetEntry = z.infer<typeof EquipmentSetEntrySchema>;
export type WeaponEntry = z.infer<typeof WeaponEntrySchema>;
export type ShieldEntry = z.infer<typeof ShieldEntrySchema>;
export type AccessoryUpgrades = z.infer<typeof AccessoryUpgradesSchema>;
export type AccessorySetEntry = z.infer<typeof AccessorySetEntrySchema>;
export type BlessingLine = z.infer<typeof BlessingLineSchema>;
export type FashionSetEntry = z.infer<typeof FashionSetEntrySchema>;
export type PetEntry = z.infer<typeof PetEntrySchema>;
export type RmBuffs = z.infer<typeof RmBuffsSchema>;
export type BuffsState = z.infer<typeof BuffsStateSchema>;
export type Offhand = z.infer<typeof OffhandSchema>;
export type GearSwap = z.infer<typeof GearSwapSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type BuildState = z.infer<typeof BuildStateSchema>;

export const GEAR_LIST_KEYS = [
  'equipmentSets',
  'weapons',
  'shields',
  'accessorySets',
  'fashionSets',
  'pets',
] as const;
export type GearListKey = (typeof GEAR_LIST_KEYS)[number];

export const ENTRY_LIST_KEYS = ['statPages', ...GEAR_LIST_KEYS, 'gearSwaps'] as const;
export type EntryListKey = (typeof ENTRY_LIST_KEYS)[number];

export type EntryOf<K extends EntryListKey> = BuildState[K][number];
export type AnyEntry = EntryOf<EntryListKey>;
