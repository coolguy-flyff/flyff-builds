import {
  EARRING_VARIANTS,
  RM_BUFF_SKILL_IDS,
  STAT_KEYS,
  accessoryLinesFor,
  classSkillsFor,
  type GameData,
  type SlimItem,
} from '@/data';
import {
  createAccessorySetEntry,
  createEquipmentSetEntry,
  createFashionSetEntry,
  createGearSwap,
  createPetEntry,
  createShieldEntry,
  createStatPage,
  createWeaponEntry,
} from '@/domain/build/defaults';
import { withWeaponItem, withWeaponUpgrade } from '@/domain/build/derive';
import {
  ACCESSORY_PIECE_KEYS,
  BUILD_SCHEMA_VERSION,
  LIMITS,
  MAX_UPGRADE_LEVEL,
  type AccessorySetEntry,
  type BlessingLine,
  type BuildState,
  type EquipmentSetEntry,
  type FashionSetEntry,
  type GearSwap,
  type Offhand,
  type PetEntry,
  type RandomStatLine,
  type ShieldEntry,
  type SkillAwake,
  type Stack,
  type StatAwake,
  type StatPage,
  type WeaponEntry,
} from '@/domain/build/schema';
import {
  accessoryPieceSet,
  accessoryPieceSource,
  accessorySlotOf,
  clampAccessoryUpgrade,
  necklaceVariantsOf,
  piercingSlots,
  randomStatBounds,
  rangedAbilities,
  reachableBlessingTotals,
  reachablePetTotals,
  skillAwakeOptions,
  statAwakeCombos,
  statRangeBounds,
  totalStatPoints,
  type ValueBounds,
  maxStackCount,
} from '@/domain/rules';
import { requireDefined } from '@/lib/assert';
import { roundTo } from '@/lib/math';

/**
 * Seeded generator of valid builds over the real game data, for round-trip property tests. Every
 * value it produces is one the UI could produce, so `validateBuild` must accept it without repairs.
 */

export type Rng = () => number;

/** mulberry32: small, fast, deterministic. */
export function createRng(seed: number): Rng {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);

    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES = ['Main', 'Alt ✨', 'Étranar', 'PvE farm', 'Bossing', 'Test 123'] as const;
const MAX_JEWEL_STACK_CAPACITY = 10;

function int(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function coin(rng: Rng, probability = 0.5): boolean {
  return rng() < probability;
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return requireDefined(items[int(rng, 0, items.length - 1)], 'cannot pick from an empty list');
}

function pickOptional<T>(rng: Rng, items: readonly T[], probability = 0.7): T | null {
  return items.length > 0 && coin(rng, probability) ? pick(rng, items) : null;
}

function subset<T>(rng: Rng, items: readonly T[], maxCount: number): T[] {
  const shuffled = [...items].sort(() => rng() - 0.5);

  return shuffled.slice(0, int(rng, 0, Math.min(maxCount, items.length)));
}

function customName(rng: Rng): { customName?: string } {
  return coin(rng, 0.4) ? { customName: pick(rng, NAMES) } : {};
}

function onGrid(rng: Rng, bounds: ValueBounds): number {
  const steps = Math.round((bounds.max - bounds.min) / bounds.step);

  return roundTo(bounds.min + int(rng, 0, steps) * bounds.step, 4);
}

function randomStacks(rng: Rng, items: readonly SlimItem[], capacity: number): Stack[] {
  const stacks: Stack[] = [];
  const used = new Map<number, number>();
  let remaining = capacity;

  while (remaining > 0 && coin(rng, 0.7)) {
    // Respect per-item caps (runes can be slotted once per type).
    const available = items.filter((item) => maxStackCount(item) - (used.get(item.id) ?? 0) > 0);

    if (available.length === 0) {
      break;
    }

    const item = pick(rng, available);
    const cap = Math.min(remaining, maxStackCount(item) - (used.get(item.id) ?? 0));
    const count = int(rng, 1, cap);

    stacks.push({ itemId: item.id, count });
    used.set(item.id, (used.get(item.id) ?? 0) + count);
    remaining -= count;
  }

  return stacks;
}

function randomStatAwake(rng: Rng, data: GameData): StatAwake {
  let awake: StatAwake = [null, null];

  if (coin(rng, 0.6)) {
    const combo = pick(rng, statAwakeCombos(data));
    awake = [combo.first, combo.second];
  }

  return awake;
}

function randomSkillAwake(rng: Rng, data: GameData, item: SlimItem): SkillAwake | null {
  const option = pickOptional(rng, skillAwakeOptions(data, item), 0.6);

  return option === null ? null : { parameter: option.parameter, value: pick(rng, option.values) };
}

function randomStatPage(rng: Rng, id: number, level: number): StatPage {
  const page = createStatPage(id);
  let remaining = totalStatPoints(level);

  for (const stat of subset(rng, STAT_KEYS, STAT_KEYS.length)) {
    const spent = int(rng, 0, remaining);
    page[stat] += spent;
    remaining -= spent;
  }

  return { ...page, ...customName(rng) };
}

function randomEquipmentSet(
  rng: Rng,
  data: GameData,
  id: number,
  jobId: number,
): EquipmentSetEntry {
  const sets = data.armorSetsByJob.get(jobId) ?? [];

  return {
    ...createEquipmentSetEntry(id, pickOptional(rng, sets)?.id ?? null),
    ...customName(rng),
    upgrade: int(rng, 0, MAX_UPGRADE_LEVEL),
    statAwake: randomStatAwake(rng, data),
    suitCards: randomStacks(rng, data.suitCards, 4),
  };
}

function randomRandomStats(
  rng: Rng,
  item: SlimItem,
  lines: readonly (RandomStatLine | null)[],
): (RandomStatLine | null)[] {
  return lines.map((line, index) => {
    let next: RandomStatLine | null = null;

    if (line !== null && coin(rng, 0.85)) {
      const ability = requireDefined(
        item.possibleRandomStats?.find((candidate) => candidate.parameter === line.parameter),
        `${item.name} lost random stat ${line.parameter}`,
      );
      next = { parameter: line.parameter, value: onGrid(rng, randomStatBounds(ability, index)) };
    }

    return next;
  });
}

function randomWeapon(rng: Rng, data: GameData, id: number, jobId: number): WeaponEntry {
  const item = pickOptional(rng, data.weaponsByJob.get(jobId) ?? [], 0.85);
  let entry: WeaponEntry = { ...createWeaponEntry(id), ...customName(rng) };

  if (item !== null) {
    const upgrade = int(rng, 0, MAX_UPGRADE_LEVEL);
    const derived = withWeaponUpgrade(data, withWeaponItem(data, entry, item.id), upgrade);
    entry = {
      ...derived,
      statAwake: randomStatAwake(rng, data),
      skillAwake: randomSkillAwake(rng, data, item),
      cards: randomStacks(rng, data.weaponCards, piercingSlots(item)),
      jewels:
        item.rarity === 'ultimate' ? randomStacks(rng, data.jewels, MAX_JEWEL_STACK_CAPACITY) : [],
      statRanges: rangedAbilities(item).map((ability) => onGrid(rng, statRangeBounds(ability))),
      randomStats: randomRandomStats(rng, item, derived.randomStats),
    };
  }

  return entry;
}

function randomShield(rng: Rng, data: GameData, id: number, jobId: number): ShieldEntry {
  const item = pickOptional(rng, data.shieldsByJob.get(jobId) ?? [], 0.85);
  let entry: ShieldEntry = { ...createShieldEntry(id), ...customName(rng) };

  if (item !== null) {
    entry = {
      ...entry,
      itemId: item.id,
      upgrade: int(rng, 0, MAX_UPGRADE_LEVEL),
      statAwake: randomStatAwake(rng, data),
      skillAwake: randomSkillAwake(rng, data, item),
      cards: randomStacks(rng, data.weaponCards, piercingSlots(item)),
    };
  }

  return entry;
}

function randomAccessorySet(rng: Rng, data: GameData, id: number): AccessorySetEntry {
  const set = pickOptional(rng, data.accessorySets, 0.85);
  const entry: AccessorySetEntry = {
    ...createAccessorySetEntry(id, set?.id ?? null),
    ...customName(rng),
    earring1: pick(rng, EARRING_VARIANTS),
    earring2: pick(rng, EARRING_VARIANTS),
  };

  for (const piece of ACCESSORY_PIECE_KEYS) {
    // One piece in five is mixed in from another set or a CW jewel line of the piece's slot.
    const sources = [...data.accessorySets, ...accessoryLinesFor(data, accessorySlotOf(piece))];

    entry.pieceSources[piece] = pickOptional(rng, sources, 0.2)?.id ?? null;
    entry.upgrades[piece] = clampAccessoryUpgrade(
      accessoryPieceSource(data, entry, piece),
      int(rng, 0, MAX_UPGRADE_LEVEL),
    );
  }

  entry.necklace = pick(rng, necklaceVariantsOf(accessoryPieceSet(data, entry, 'necklace')));

  return entry;
}

function randomFashionSet(rng: Rng, data: GameData, id: number): FashionSetEntry {
  const blessings: BlessingLine[] = subset(rng, Object.keys(data.blessings), 5).map(
    (parameter) => ({ parameter, total: pick(rng, reachableBlessingTotals(data, parameter)) }),
  );

  return {
    ...createFashionSetEntry(id),
    ...customName(rng),
    speedPercent: int(rng, 0, 10),
    blessings,
    cloakItemId: pickOptional(rng, data.cloaks)?.id ?? null,
  };
}

function randomPet(rng: Rng, data: GameData, id: number): PetEntry {
  const def = pickOptional(rng, data.pets, 0.85);
  const total = def === null ? 0 : pick(rng, reachablePetTotals(def));

  return { ...createPetEntry(id, def?.petItemId ?? null, total), ...customName(rng) };
}

function randomOffhand(
  rng: Rng,
  shields: readonly ShieldEntry[],
  weapons: readonly WeaponEntry[],
): Offhand {
  let offhand: Offhand = null;
  const roll = rng();

  if (roll < 0.35 && shields.length > 0) {
    offhand = { kind: 'shield', id: pick(rng, shields).id };
  } else if (roll < 0.55 && weapons.length > 0) {
    offhand = { kind: 'weapon', id: pick(rng, weapons).id };
  }

  return offhand;
}

function randomList<T>(
  rng: Rng,
  maxCount: number,
  nextId: () => number,
  create: (id: number) => T,
): T[] {
  const items: T[] = [];
  const count = int(rng, 0, maxCount);

  for (let index = 0; index < count; index += 1) {
    items.push(create(nextId()));
  }

  return items;
}

export function randomBuild(data: GameData, seed: number): BuildState {
  const rng = createRng(seed);
  const job = pick(rng, data.thirdJobs);
  const level = int(rng, job.minLevel, job.maxLevel);
  let lastId = 0;

  const nextId = (): number => {
    lastId += 1;

    return lastId;
  };

  const statPages = randomList(rng, 2, nextId, (id) => randomStatPage(rng, id, level));
  statPages.push(randomStatPage(rng, nextId(), level));

  const equipmentSets = randomList(rng, 3, nextId, (id) =>
    randomEquipmentSet(rng, data, id, job.id),
  );
  const weapons = randomList(rng, 4, nextId, (id) => randomWeapon(rng, data, id, job.id));
  const shields = randomList(rng, 2, nextId, (id) => randomShield(rng, data, id, job.id));
  const accessorySets = randomList(rng, 2, nextId, (id) => randomAccessorySet(rng, data, id));
  const fashionSets = randomList(rng, 2, nextId, (id) => randomFashionSet(rng, data, id));
  const pets = randomList(rng, 2, nextId, (id) => randomPet(rng, data, id));

  const gearSwaps: GearSwap[] = randomList(rng, LIMITS.gearSwaps - 1, nextId, (id) => ({
    ...createGearSwap(id, pick(rng, statPages).id),
    ...customName(rng),
    includeInResults: coin(rng, 0.8),
    equipmentSetId: pickOptional(rng, equipmentSets)?.id ?? null,
    accessorySetId: pickOptional(rng, accessorySets)?.id ?? null,
    weaponId: pickOptional(rng, weapons)?.id ?? null,
    offhand: randomOffhand(rng, shields, weapons),
    fashionSetId: pickOptional(rng, fashionSets)?.id ?? null,
    petId: pickOptional(rng, pets)?.id ?? null,
    maskItemId: pickOptional(rng, data.masks, 0.5)?.id ?? null,
  }));
  gearSwaps.push(createGearSwap(nextId(), pick(rng, statPages).id));

  return {
    schemaVersion: BUILD_SCHEMA_VERSION,
    nextId: lastId + 1,
    character: { jobId: job.id, level },
    statPages,
    equipmentSets,
    weapons,
    shields,
    accessorySets,
    fashionSets,
    pets,
    buffs: {
      rmBuffs: { enabled: coin(rng), excludedSkillIds: subset(rng, RM_BUFF_SKILL_IDS, 4) },
      classSkillIds: subset(rng, classSkillsFor(data, job.id), 8).map((skill) => skill.id),
      premiumItemIds: subset(rng, data.powerups, 6).map((item) => item.id),
      personalNpcIds: subset(rng, data.personalNpcs, 4).map((npc) => npc.id),
      coupleNpcIds: subset(rng, data.personalNpcs, 3).map((npc) => npc.id),
      guildNpcIds: subset(rng, data.guildNpcs, 5).map((npc) => npc.id),
      achievementId: pickOptional(rng, data.achievements, 0.5)?.id ?? null,
    },
    gearSwaps,
  };
}
