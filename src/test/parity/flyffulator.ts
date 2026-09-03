/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Loads the Flyffulator sources (plain ESM JavaScript) and its `data-src` tables so the parity
 * suite can run the original formulas next to ours. Typed facades cover only the members the
 * harness touches; the modules themselves stay untyped JavaScript.
 */

export const FLYFFULATOR_DIR = process.env.FLYFFULATOR_DIR ?? '../Flyffulator';

/** Everything Flyffulator's `loadData` fetches except the 27 MB monster table (unused here). */
const DATA_FILES = [
  'Items',
  'Skills',
  'Classes',
  'Achievements',
  'Blessings',
  'EquipSets',
  'HousingNPCs',
  'LevelDifferencePenalties',
  'PartySkills',
  'Pets',
  'SkillAwakes',
  'StatAwakes',
  'StatNames',
  'UpgradeBonus',
] as const;

/** Optional members accept `undefined` so our zod-inferred `Ability` can be spread into it. */
export interface FlyffAbility {
  readonly parameter: string;
  readonly add: number;
  readonly rate?: boolean | undefined;
  readonly addMax?: number | undefined;
}

/** An ability instance with a chosen value (stat ranges, random stats, blessings). */
export interface FlyffRolledAbility extends FlyffAbility {
  id?: number | string;
  value: number;
}

export interface FlyffItemProp {
  readonly id: number;
  readonly name: { readonly en: string };
  readonly category: string;
  readonly subcategory?: string;
  readonly rarity?: string;
  readonly level: number;
  readonly abilities?: readonly FlyffAbility[];
  readonly possibleRandomStats?: readonly FlyffAbility[];
}

export interface FlyffItemElem {
  readonly itemProp: FlyffItemProp;
  upgradeLevel: number;
  piercings: FlyffItemElem[];
  ultimateJewels: FlyffItemElem[];
  statRanges: FlyffRolledAbility[];
  randomStats: (FlyffRolledAbility | null)[];
  statAwake: ({ parameter: string; value: number } | null)[];
  skillAwake: { id: string; parameter: string; add: number } | null;
  petStats: Record<string, number | null>;
}

export interface FlyffSkillLevel {
  readonly synergies?: readonly { readonly skill: number }[];
}

export interface FlyffSkillProp {
  readonly id: number;
  readonly levels: readonly FlyffSkillLevel[];
}

export interface FlyffHitRate {
  readonly prob: number;
  readonly probAdjusted: number;
}

export interface FlyffEntity {
  job: unknown;
  level: number;
  str: number;
  sta: number;
  dex: number;
  int: number;
  bufferStr: number;
  bufferSta: number;
  bufferDex: number;
  bufferInt: number;
  equipment: Record<string, FlyffItemElem | null>;
  skillLevels: Record<number, number>;
  activeBuffs: unknown[];
  activeItems: FlyffItemElem[];
  activePersonalHousingNpcs: unknown[];
  activeCoupleHousingNpcs: unknown[];
  activeGuildHousingNpcs: unknown[];
  activeAchievements: unknown[];
  updateEquipSets(): void;
  getBaseStat(stat: string): number;
  getStat(parameter: string, rate: boolean): number;
  getHP(): number;
  getMP(): number;
  getFP(): number;
  getMovementSpeed(): number;
  getAttackSpeed(): number;
  getAttack(): number;
  getDefense(): number;
  getParry(): number;
  getCriticalChance(): number;
  getContextHitRate(defender: FlyffEntity): FlyffHitRate;
  getBlockChance(ranged: boolean, attacker: FlyffEntity): number;
}

export interface FlyffContext {
  player: FlyffEntity;
  attacker: FlyffEntity;
  defender: FlyffEntity;
  attackFlags: number;
  skill: unknown;
  readonly settings: { playerHealthPercent: number; targetHealthPercent: number };
}

export interface FlyffUtils {
  readonly DEFAULT_WEAPON: FlyffItemElem;
  readonly TRAINING_DUMMY: unknown;
  readonly ATTACK_FLAGS: { readonly GENERIC: number; readonly MAGIC: number };
  getClassById(id: number): unknown;
  getItemById(id: number): FlyffItemProp | undefined;
  getSkillById(id: number): FlyffSkillProp | undefined;
  getAchievementById(id: number): unknown;
  clamp(value: number, min: number, max: number): number;
}

export interface FlyffApi {
  readonly Items: Readonly<Record<string, FlyffItemProp>>;
  readonly Blessings: Readonly<Record<string, readonly FlyffAbility[]>>;
  readonly HousingNPCs: Readonly<Record<string, unknown>>;
}

export interface Flyffulator {
  readonly api: FlyffApi;
  readonly Entity: new (monsterProp: unknown) => FlyffEntity;
  readonly ItemElem: new (itemProp: FlyffItemProp) => FlyffItemElem;
  readonly Skill: new (skillProp: FlyffSkillProp, level: number, stacks?: number) => unknown;
  readonly Context: FlyffContext;
  readonly Utils: FlyffUtils;
  readonly getHealing: (skillProp: FlyffSkillProp) => number;
}

export function hasFlyffulator(): boolean {
  return (
    existsSync(join(FLYFFULATOR_DIR, 'src/flyff/flyffentity.js')) &&
    existsSync(join(FLYFFULATOR_DIR, 'data-src/Items.json'))
  );
}

/**
 * Prefers this repo's own data-src (the tables the app is actually built from) so both engines
 * read identical data, falling back to the Flyffulator checkout for the files we don't scrape
 * (LevelDifferencePenalties, PartySkills).
 */
function loadApi(): Record<string, unknown> {
  const api: Record<string, unknown> = {};

  for (const name of DATA_FILES) {
    const local = join('data-src', `${name}.json`);
    const path = existsSync(local) ? local : join(FLYFFULATOR_DIR, 'data-src', `${name}.json`);
    api[name] = JSON.parse(readFileSync(path, 'utf8'));
  }

  return api;
}

async function importModule<T>(relativePath: string): Promise<T> {
  const url = pathToFileURL(join(FLYFFULATOR_DIR, relativePath)).href;

  return (await import(/* @vite-ignore */ url)) as T;
}

/**
 * Fills Flyffulator's `API` object synchronously (its `loadData` fetches gzipped files from a dev
 * server) and imports the engine modules that read it.
 */
export async function loadFlyffulator(): Promise<Flyffulator> {
  const api = loadApi();
  const dataModule = await importModule<{ API: Record<string, unknown> }>('src/data.js');

  Object.assign(dataModule.API, api);

  const [entity, itemElem, skill, context, utils, calculator] = await Promise.all([
    importModule<{ default: Flyffulator['Entity'] }>('src/flyff/flyffentity.js'),
    importModule<{ default: Flyffulator['ItemElem'] }>('src/flyff/flyffitemelem.js'),
    importModule<{ default: Flyffulator['Skill'] }>('src/flyff/flyffskill.js'),
    importModule<{ default: FlyffContext }>('src/flyff/flyffcontext.js'),
    importModule<FlyffUtils>('src/flyff/flyffutils.js'),
    importModule<{ getHealing: Flyffulator['getHealing'] }>('src/flyff/flyffdamagecalculator.js'),
  ]);

  return {
    api: dataModule.API as unknown as FlyffApi,
    Entity: entity.default,
    ItemElem: itemElem.default,
    Skill: skill.default,
    Context: context.default,
    Utils: utils,
    getHealing: calculator.getHealing,
  };
}
