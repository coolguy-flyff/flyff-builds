import {
  RM_BUFF_SKILL_IDS,
  classSkillsFor,
  getItem,
  isAnteriorJob,
  type GameData,
  type SlimItem,
} from '@/data';
import { clamp } from '@/lib/math';

import {
  accessoryPieceSet,
  accessoryPieceSource,
  accessorySlotOf,
  clampAccessoryUpgrade,
  findAccessoryPieceSource,
  findAccessorySet,
  fitsAccessoryPiece,
  hasRandomStats,
  isReachableBlessingTotal,
  isReachablePetTotal,
  isValidSetStatAwake,
  isValidSkillAwake,
  isValidStatAwake,
  isWithinBounds,
  maxStackCount,
  necklaceVariantsOf,
  piercingSlots,
  randomStatBounds,
  randomStatLineCount,
  rangedAbilities,
  reachableBlessingTotals,
  reachablePetTotals,
  statRangeBounds,
} from '../rules';

import { DEFAULT_JOB_ID } from './defaults';
import { defaultStatRangeValue } from '../rules/randomStats';
import { repairReferences } from './references';
import {
  ACCESSORY_PIECE_KEYS,
  BuildStateSchema,
  LIMITS,
  type AccessorySetEntry,
  type BlessingLine,
  type BuildState,
  type EquipmentSetEntry,
  type FashionSetEntry,
  type PetEntry,
  type RandomStatLine,
  type ShieldEntry,
  type Stack,
  type WeaponEntry,
} from './schema';

/**
 * Semantic validation and repair of a structurally valid build against the game data. Never throws
 * for bad content: unknown ids are dropped, impossible values are clamped/snapped, and each repair is
 * reported as a warning so the UI can tell the user what changed. Stat pages are never mutated
 * (over-allocation is surfaced as an issue instead). Shared by localStorage load, snapshots,
 * share-code import and job changes.
 */

export interface BuildWarning {
  readonly code: string;
  readonly message: string;
}

export interface ValidatedBuild {
  readonly build: BuildState;
  readonly warnings: readonly BuildWarning[];
}

export interface BuildStructureError {
  readonly code: 'structure';
  readonly message: string;
}

export type ValidationResult =
  | { readonly ok: true; readonly value: ValidatedBuild }
  | { readonly ok: false; readonly error: BuildStructureError };

class Repairs {
  readonly warnings: BuildWarning[] = [];

  add(code: string, message: string): void {
    this.warnings.push({ code, message });
  }
}

function isThirdJob(data: GameData, jobId: number): boolean {
  return data.thirdJobs.some((job) => job.id === jobId);
}

function usableByJob(data: GameData, jobId: number, item: SlimItem): boolean {
  return item.class === undefined || isAnteriorJob(data, jobId, item.class);
}

function repairStacks(
  data: GameData,
  stacks: readonly Stack[],
  capacity: number,
  accept: (item: SlimItem) => boolean,
  context: string,
  repairs: Repairs,
): Stack[] {
  const kept: Stack[] = [];
  const perItem = new Map<number, number>();
  let remaining = capacity;

  for (const stack of stacks) {
    const item = getItem(data, stack.itemId);

    if (item === undefined || !accept(item)) {
      repairs.add('unknown-item', `${context}: dropped unknown or invalid item ${stack.itemId}`);
      continue;
    }

    if (remaining <= 0) {
      repairs.add(
        'stack-trimmed',
        `${context}: dropped ${stack.count} × ${item.name} beyond capacity`,
      );
      continue;
    }

    const already = perItem.get(item.id) ?? 0;
    const itemCap = Math.max(maxStackCount(item) - already, 0);
    const count = Math.min(stack.count, remaining, itemCap);

    if (count < stack.count) {
      repairs.add('stack-trimmed', `${context}: trimmed ${item.name} to ${count}`);
    }

    if (count > 0) {
      kept.push({ itemId: stack.itemId, count });
      perItem.set(item.id, already + count);
      remaining -= count;
    }
  }

  return kept;
}

function repairStatRanges(
  item: SlimItem,
  values: readonly number[],
  context: string,
  repairs: Repairs,
): number[] {
  const ranged = rangedAbilities(item);

  return ranged.map((ability, index) => {
    const bounds = statRangeBounds(ability);
    const stored = values[index];
    let value = stored ?? defaultStatRangeValue(ability);

    if (stored !== undefined && !isWithinBounds(stored, bounds)) {
      value = clamp(stored, bounds.min, bounds.max);
      repairs.add('range-clamped', `${context}: ${ability.parameter} range clamped to ${value}`);
    }

    return value;
  });
}

function repairRandomStats(
  item: SlimItem,
  upgrade: number,
  lines: readonly (RandomStatLine | null)[],
  context: string,
  repairs: Repairs,
): (RandomStatLine | null)[] {
  const repaired: (RandomStatLine | null)[] = [];

  if (hasRandomStats(item)) {
    const possible = item.possibleRandomStats ?? [];
    const used = new Set<string>();
    const activeCount = Math.min(randomStatLineCount(upgrade), LIMITS.randomStatLines);
    const lockedCount = lines.slice(activeCount).filter((line) => line !== null).length;

    if (lockedCount > 0) {
      repairs.add(
        'random-stat-dropped',
        `${context}: ${lockedCount} locked random-stat line${lockedCount === 1 ? '' : 's'} cleared`,
      );
    }

    for (const [index, line] of lines.slice(0, activeCount).entries()) {
      let next: RandomStatLine | null = null;

      if (line !== null) {
        const ability = possible.find((candidate) => candidate.parameter === line.parameter);

        if (ability === undefined || used.has(line.parameter)) {
          repairs.add('random-stat-dropped', `${context}: random stat ${line.parameter} dropped`);
        } else {
          const bounds = randomStatBounds(ability, index);
          const value = isWithinBounds(line.value, bounds)
            ? line.value
            : clamp(line.value, bounds.min, bounds.max);

          if (value !== line.value) {
            repairs.add(
              'random-stat-clamped',
              `${context}: random stat ${line.parameter} clamped to ${value}`,
            );
          }

          used.add(line.parameter);
          next = { parameter: line.parameter, value };
        }
      }

      repaired.push(next);
    }
  } else if (lines.length > 0) {
    repairs.add('random-stat-dropped', `${context}: random stats dropped (item has none)`);
  }

  return repaired;
}

function repairEquipmentSet(
  data: GameData,
  jobId: number,
  entry: EquipmentSetEntry,
  repairs: Repairs,
): EquipmentSetEntry {
  const context = `Equipment set #${entry.id}`;
  const set = entry.setId === null ? undefined : data.armorSets.get(entry.setId);
  let setId = entry.setId;

  if (entry.setId !== null && (set === undefined || !isAnteriorJob(data, jobId, set.jobId))) {
    repairs.add(
      'unknown-set',
      `${context}: armor set ${entry.setId} is unknown or not for this job`,
    );
    setId = null;
  }

  let statAwake = entry.statAwake;

  if (!isValidSetStatAwake(data, entry.statAwake)) {
    repairs.add('awake-cleared', `${context}: invalid stat awake cleared`);
    statAwake = [null, null];
  }

  const suitCards = repairStacks(
    data,
    entry.suitCards,
    4,
    (item) => item.pierceTarget === 'suit',
    context,
    repairs,
  );

  return { ...entry, setId, statAwake, suitCards };
}

function repairWeapon(
  data: GameData,
  jobId: number,
  entry: WeaponEntry,
  repairs: Repairs,
): WeaponEntry {
  const context = `Weapon #${entry.id}`;
  const item = entry.itemId === null ? undefined : getItem(data, entry.itemId);
  let next: WeaponEntry = entry;

  if (entry.itemId !== null && (item?.category !== 'weapon' || !usableByJob(data, jobId, item))) {
    repairs.add(
      'unknown-item',
      `${context}: weapon ${entry.itemId} is unknown or not usable by this job`,
    );
    next = {
      ...entry,
      itemId: null,
      statRanges: [],
      randomStats: [],
      skillAwake: null,
      cards: [],
      jewels: [],
    };
  } else if (item !== undefined) {
    const skillAwake =
      entry.skillAwake !== null && isValidSkillAwake(data, item, entry.skillAwake)
        ? entry.skillAwake
        : null;

    if (skillAwake === null && entry.skillAwake !== null) {
      repairs.add('awake-cleared', `${context}: invalid skill awake cleared`);
    }

    next = {
      ...entry,
      skillAwake,
      cards: repairStacks(
        data,
        entry.cards,
        piercingSlots(item),
        (card) => card.pierceTarget === 'weapon',
        context,
        repairs,
      ),
      jewels: repairStacks(
        data,
        entry.jewels,
        10,
        (jewel) => jewel.subcategory === 'ultimatejewel',
        context,
        repairs,
      ),
      statRanges: repairStatRanges(item, entry.statRanges, context, repairs),
      randomStats: repairRandomStats(item, entry.upgrade, entry.randomStats, context, repairs),
    };
  }

  if (!isValidStatAwake(data, next.statAwake)) {
    repairs.add('awake-cleared', `${context}: invalid stat awake cleared`);
    next = { ...next, statAwake: [null, null] };
  }

  return next;
}

function repairShield(
  data: GameData,
  jobId: number,
  entry: ShieldEntry,
  repairs: Repairs,
): ShieldEntry {
  const context = `Shield #${entry.id}`;
  const item = entry.itemId === null ? undefined : getItem(data, entry.itemId);
  let next: ShieldEntry = entry;

  if (
    entry.itemId !== null &&
    (item?.subcategory !== 'shield' || !usableByJob(data, jobId, item))
  ) {
    repairs.add(
      'unknown-item',
      `${context}: shield ${entry.itemId} is unknown or not usable by this job`,
    );
    next = { ...entry, itemId: null, skillAwake: null, cards: [] };
  } else if (item !== undefined) {
    const skillAwake =
      entry.skillAwake !== null && isValidSkillAwake(data, item, entry.skillAwake)
        ? entry.skillAwake
        : null;

    if (skillAwake === null && entry.skillAwake !== null) {
      repairs.add('awake-cleared', `${context}: invalid skill awake cleared`);
    }

    next = {
      ...entry,
      skillAwake,
      cards: repairStacks(
        data,
        entry.cards,
        piercingSlots(item),
        (card) => card.pierceTarget === 'weapon',
        context,
        repairs,
      ),
    };
  }

  if (!isValidStatAwake(data, next.statAwake)) {
    repairs.add('awake-cleared', `${context}: invalid stat awake cleared`);
    next = { ...next, statAwake: [null, null] };
  }

  return next;
}

function repairAccessorySet(
  data: GameData,
  entry: AccessorySetEntry,
  repairs: Repairs,
): AccessorySetEntry {
  const context = `Accessory set #${entry.id}`;
  let next = entry;

  if (entry.setId !== null && findAccessorySet(data, entry.setId) === null) {
    repairs.add('unknown-set', `${context}: accessory set ${entry.setId} is unknown`);
    next = { ...next, setId: null };
  }

  for (const piece of ACCESSORY_PIECE_KEYS) {
    const sourceId = entry.pieceSources[piece];
    const source = sourceId === null ? null : findAccessoryPieceSource(data, sourceId);
    let problem: string | null = null;

    if (sourceId !== null && source === null) {
      problem = `${piece} source ${sourceId} is neither an accessory set nor a CW jewel`;
    } else if (source?.kind === 'line' && !fitsAccessoryPiece(source, piece)) {
      problem = `${source.line.name} is a ${source.line.slot}, not a ${accessorySlotOf(piece)}`;
    }

    if (problem !== null) {
      repairs.add('unknown-set', `${context}: ${problem}`);
      next = { ...next, pieceSources: { ...next.pieceSources, [piece]: null } };
    }
  }

  // A CW jewel only exists at its tiers ("+1"…"+5"); a set piece's 0…10 is already structural.
  for (const piece of ACCESSORY_PIECE_KEYS) {
    const upgrade = next.upgrades[piece];
    const clamped = clampAccessoryUpgrade(accessoryPieceSource(data, next, piece), upgrade);

    if (clamped !== upgrade) {
      repairs.add(
        'upgrade-clamped',
        `${context}: ${piece} has no +${upgrade} tier; using +${clamped}`,
      );
      next = { ...next, upgrades: { ...next.upgrades, [piece]: clamped } };
    }
  }

  const necklaceSet = accessoryPieceSet(data, next, 'necklace');

  if (necklaceSet !== null && !necklaceVariantsOf(necklaceSet).includes(next.necklace)) {
    repairs.add(
      'variant-unavailable',
      `${context}: ${necklaceSet.name} has no Peision necklace; using Gore`,
    );
    next = { ...next, necklace: 'gore' };
  }

  return next;
}

function nearestReachable(totals: readonly number[], total: number): number {
  let best = totals[0] ?? 0;

  for (const candidate of totals) {
    if (Math.abs(candidate - total) < Math.abs(best - total)) {
      best = candidate;
    }
  }

  return best;
}

function repairFashionSet(
  data: GameData,
  entry: FashionSetEntry,
  repairs: Repairs,
): FashionSetEntry {
  const context = `Fashion set #${entry.id}`;
  const seen = new Set<string>();
  const blessings: BlessingLine[] = [];

  for (const line of entry.blessings) {
    if (data.blessings[line.parameter] === undefined) {
      repairs.add('unknown-blessing', `${context}: unknown blessing ${line.parameter} dropped`);
      continue;
    }

    if (seen.has(line.parameter)) {
      repairs.add('blessing-merged', `${context}: duplicate blessing ${line.parameter} dropped`);
      continue;
    }

    seen.add(line.parameter);
    let total = line.total;

    if (!isReachableBlessingTotal(data, line.parameter, total)) {
      total = nearestReachable(reachableBlessingTotals(data, line.parameter), total);
      repairs.add('blessing-snapped', `${context}: blessing ${line.parameter} snapped to ${total}`);
    }

    blessings.push({ parameter: line.parameter, total });
  }

  let cloakItemId = entry.cloakItemId;

  if (cloakItemId !== null && !data.cloaks.some((cloak) => cloak.id === cloakItemId)) {
    repairs.add('unknown-item', `${context}: unknown cloak ${cloakItemId} dropped`);
    cloakItemId = null;
  }

  return { ...entry, blessings, cloakItemId };
}

function repairPet(data: GameData, entry: PetEntry, repairs: Repairs): PetEntry {
  const context = `Pet #${entry.id}`;
  const def =
    entry.petItemId === null
      ? undefined
      : data.pets.find((pet) => pet.petItemId === entry.petItemId);
  let next = entry;

  if (entry.petItemId !== null && def === undefined) {
    repairs.add('unknown-item', `${context}: unknown pet ${entry.petItemId} dropped`);
    next = { ...entry, petItemId: null };
  } else if (def !== undefined && !isReachablePetTotal(def, entry.total)) {
    const total = nearestReachable(reachablePetTotals(def), entry.total);
    repairs.add('pet-total-snapped', `${context}: total snapped to ${total}`);
    next = { ...entry, total };
  }

  return next;
}

function keepKnown(
  ids: readonly number[],
  known: ReadonlySet<number>,
  context: string,
  repairs: Repairs,
): number[] {
  const kept: number[] = [];

  for (const id of ids) {
    if (known.has(id) && !kept.includes(id)) {
      kept.push(id);
    } else if (!known.has(id)) {
      repairs.add('unknown-id', `${context}: unknown id ${id} dropped`);
    }
  }

  return kept;
}

function repairBuffs(data: GameData, build: BuildState, repairs: Repairs): BuildState['buffs'] {
  const buffs = build.buffs;
  const rmIds = new Set<number>(RM_BUFF_SKILL_IDS);
  const classSkillIds = new Set(
    classSkillsFor(data, build.character.jobId).map((skill) => skill.id),
  );
  const powerupIds = new Set(data.powerups.map((item) => item.id));
  const personalIds = new Set(data.personalNpcs.map((npc) => npc.id));
  const guildIds = new Set(data.guildNpcs.map((npc) => npc.id));
  let achievementId = buffs.achievementId;

  if (
    achievementId !== null &&
    !data.achievements.some((achievement) => achievement.id === achievementId)
  ) {
    repairs.add('unknown-id', `Buffs: unknown achievement ${achievementId} dropped`);
    achievementId = null;
  }

  return {
    rmBuffs: {
      enabled: buffs.rmBuffs.enabled,
      excludedSkillIds: keepKnown(buffs.rmBuffs.excludedSkillIds, rmIds, 'RM buffs', repairs),
    },
    // Skills of another job (after a job change, or a hand-edited code) are dropped, not kept idle.
    classSkillIds: keepKnown(buffs.classSkillIds, classSkillIds, 'Class skills', repairs),
    premiumItemIds: keepKnown(buffs.premiumItemIds, powerupIds, 'Premium items', repairs),
    personalNpcIds: keepKnown(buffs.personalNpcIds, personalIds, 'Personal house', repairs),
    coupleNpcIds: keepKnown(buffs.coupleNpcIds, personalIds, 'Couple house', repairs),
    guildNpcIds: keepKnown(buffs.guildNpcIds, guildIds, 'Guild ship', repairs),
    achievementId,
  };
}

function highestId(build: BuildState): number {
  let highest = 0;

  for (const entries of [
    build.statPages,
    build.equipmentSets,
    build.weapons,
    build.shields,
    build.accessorySets,
    build.fashionSets,
    build.pets,
    build.gearSwaps,
  ]) {
    for (const entry of entries) {
      highest = Math.max(highest, entry.id);
    }
  }

  return highest;
}

/** Semantic repair of an already structurally valid build. */
export function repairBuild(data: GameData, input: BuildState): ValidatedBuild {
  const repairs = new Repairs();
  let jobId = input.character.jobId;

  if (!isThirdJob(data, jobId)) {
    repairs.add('unknown-job', `Unknown job ${jobId}; using the default job`);
    jobId = DEFAULT_JOB_ID;
  }

  const job = data.classes.get(jobId);
  const level =
    job === undefined
      ? input.character.level
      : clamp(input.character.level, job.minLevel, job.maxLevel);

  if (level !== input.character.level) {
    repairs.add('level-clamped', `Level clamped to ${level}`);
  }

  const masks = new Set(data.masks.map((mask) => mask.id));

  const repaired: BuildState = {
    ...input,
    character: { jobId, level },
    equipmentSets: input.equipmentSets.map((entry) =>
      repairEquipmentSet(data, jobId, entry, repairs),
    ),
    weapons: input.weapons.map((entry) => repairWeapon(data, jobId, entry, repairs)),
    shields: input.shields.map((entry) => repairShield(data, jobId, entry, repairs)),
    accessorySets: input.accessorySets.map((entry) => repairAccessorySet(data, entry, repairs)),
    fashionSets: input.fashionSets.map((entry) => repairFashionSet(data, entry, repairs)),
    pets: input.pets.map((entry) => repairPet(data, entry, repairs)),
    buffs: repairBuffs(data, input, repairs),
    gearSwaps: input.gearSwaps.map((swap) => {
      let next = swap;

      if (swap.maskItemId !== null && !masks.has(swap.maskItemId)) {
        repairs.add('unknown-item', `Swap #${swap.id}: unknown mask ${swap.maskItemId} dropped`);
        next = { ...swap, maskItemId: null };
      }

      return next;
    }),
  };

  const { build: referenced, dangling } = repairReferences(repaired);

  for (const reference of dangling) {
    repairs.add(
      'dangling-reference',
      `Swap #${reference.swapId}: ${reference.slot} pointed at missing entry ${reference.missingId}`,
    );
  }

  const nextId = Math.max(referenced.nextId, highestId(referenced) + 1);

  return {
    build: nextId === referenced.nextId ? referenced : { ...referenced, nextId },
    warnings: repairs.warnings,
  };
}

/** Structural (zod) then semantic validation of untrusted input (storage, snapshots, share codes). */
export function validateBuild(data: GameData, raw: unknown): ValidationResult {
  const parsed = BuildStateSchema.safeParse(raw);
  let result: ValidationResult;

  if (parsed.success) {
    result = { ok: true, value: repairBuild(data, parsed.data) };
  } else {
    const first = parsed.error.issues[0];
    const where = first === undefined ? '' : ` at ${first.path.join('.') || 'root'}`;
    result = {
      ok: false,
      error: {
        code: 'structure',
        message: `Build data is malformed${where}: ${first?.message ?? 'unknown issue'}`,
      },
    };
  }

  return result;
}
