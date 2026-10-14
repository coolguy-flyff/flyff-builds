import { jobAtLevel, type GameData, type SlimClass, type SlimItem } from '@/data';
import { requireDefined } from '@/lib/assert';

import type { BuildState, GearSwap, Offhand, StatPage } from '../build/schema';
import { isArmorSetUsable, isItemUsable, isOneHandedWeapon, offhandKind } from '../rules';
import type { Collected } from './abilities/collect';
import type { Contribution } from './abilities/types';
import { resolveBuffs } from './buffs';
import { DEFAULT_WEAPON } from './defaultWeapon';
import { resolveAccessorySetEntry } from './gear/accessorySet';
import { resolveEquipmentSetEntry, type EquipmentSetResolution } from './gear/equipmentSet';
import { resolveFashionSetEntry } from './gear/fashionSet';
import { collectMask } from './gear/mask';
import { resolvePetEntry } from './gear/pet';
import { resolvePetGrace } from './gear/petGrace';
import { resolveShieldEntry } from './gear/shield';
import { resolveWeaponEntry, type WeaponResolution } from './gear/weapon';
import { ENGINE_ISSUE_CODES, engineError, type EngineIssue } from './issues';
import { DEFAULT_ENGINE_OPTIONS, type EngineOptions } from './options';
import type { EquippedItem, ResolvedCharacter, ResolvedOffhand } from './types';

interface Identified {
  readonly id: number;
}

/** A dangling reference is reported and treated as an empty slot; `null` ids are empty slots. */
function findEntry<T extends Identified>(
  entries: readonly T[],
  id: number | null,
  what: string,
  issues: EngineIssue[],
): T | null {
  let entry: T | null = null;

  if (id !== null) {
    entry = entries.find((candidate) => candidate.id === id) ?? null;

    if (entry === null) {
      issues.push(
        engineError(
          ENGINE_ISSUE_CODES.missingEntry,
          `${what} #${id} no longer exists; the slot counts as empty`,
        ),
      );
    }
  }

  return entry;
}

function resolveStatPage(build: BuildState, swap: GearSwap, issues: EngineIssue[]): StatPage {
  let page = build.statPages.find((candidate) => candidate.id === swap.statPageId);

  if (page === undefined) {
    page = requireDefined(build.statPages[0], 'A build always has at least one stat page');
    issues.push(
      engineError(
        ENGINE_ISSUE_CODES.missingEntry,
        `Stat page #${swap.statPageId} no longer exists; using "${page.customName ?? 'the first page'}"`,
      ),
    );
  }

  return page;
}

interface OffhandResolution extends Collected {
  readonly offhand: ResolvedOffhand | null;
}

const NO_OFFHAND: OffhandResolution = { offhand: null, contributions: [], issues: [] };

interface GearContext {
  readonly data: GameData;
  readonly build: BuildState;
  /** The job the character holds at its level, not the third-job path the build is for. */
  readonly job: SlimClass;
  readonly level: number;
}

function cannotEquip(ctx: GearContext, name: string): string {
  return `Lv ${ctx.level} ${ctx.job.name} cannot equip ${name}`;
}

function unusableGear(ctx: GearContext, name: string): EngineIssue {
  return engineError(
    ENGINE_ISSUE_CODES.gearUnusable,
    `${cannotEquip(ctx, name)}; the slot counts as empty`,
  );
}

/** The mainhand, or none (bare hands) when the job at this level cannot wield it. */
function usableMainhand(
  ctx: GearContext,
  mainhand: WeaponResolution | null,
  issues: EngineIssue[],
): WeaponResolution | null {
  let usable = mainhand;
  const item = mainhand?.item ?? null;

  if (item !== null && !isItemUsable(ctx.data, ctx.job.id, ctx.level, item)) {
    issues.push(unusableGear(ctx, item.name));
    usable = null;
  }

  return usable;
}

/** The equipment set, or none when the job at this level cannot wear it. */
function usableEquipment(
  ctx: GearContext,
  equipment: EquipmentSetResolution | null,
  issues: EngineIssue[],
): EquipmentSetResolution | null {
  let usable = equipment;
  const set = equipment?.set ?? null;

  if (set !== null && !isArmorSetUsable(ctx.data, ctx.job.id, ctx.level, set)) {
    issues.push(unusableGear(ctx, set.name));
    usable = null;
  }

  return usable;
}

function ignoredOffhand(message: string): OffhandResolution {
  return {
    offhand: null,
    contributions: [],
    issues: [engineError(ENGINE_ISSUE_CODES.offhandIgnored, `Offhand ignored: ${message}`)],
  };
}

function acceptOffhand(
  ctx: GearContext,
  kind: 'shield' | 'weapon',
  resolution: Collected & { readonly item: SlimItem | null; readonly upgrade: number },
): OffhandResolution {
  let result: OffhandResolution = NO_OFFHAND;

  if (resolution.item !== null) {
    const item = resolution.item;

    if (kind === 'weapon' && !isOneHandedWeapon(item)) {
      result = ignoredOffhand(`${item.name} is two-handed`);
    } else if (!isItemUsable(ctx.data, ctx.job.id, ctx.level, item)) {
      result = ignoredOffhand(cannotEquip(ctx, item.name));
    } else {
      result = {
        offhand: { kind, item, upgrade: resolution.upgrade },
        contributions: resolution.contributions,
        issues: resolution.issues,
      };
    }
  }

  return result;
}

/** Applies the offhand rule (plan A3.2): 2H → none; Slayer → second 1H weapon; others → shield. */
function resolveOffhand(
  ctx: GearContext,
  stored: Offhand,
  mainhand: SlimItem,
  issues: EngineIssue[],
): OffhandResolution {
  let result: OffhandResolution = NO_OFFHAND;

  if (stored !== null) {
    const expected = offhandKind(ctx.data, ctx.job.id, mainhand);

    if (expected === 'none') {
      result = ignoredOffhand(`${mainhand.name} is two-handed`);
    } else if (stored.kind !== expected) {
      result = ignoredOffhand(
        expected === 'shield'
          ? `${ctx.job.name} pairs a one-handed weapon with a shield, not a second weapon`
          : `${ctx.job.name} dual-wields a second one-handed weapon, not a shield`,
      );
    } else if (stored.kind === 'shield') {
      const entry = findEntry(ctx.build.shields, stored.id, 'Shield', issues);

      if (entry !== null) {
        result = acceptOffhand(ctx, 'shield', resolveShieldEntry(ctx.data, entry));
      }
    } else {
      const entry = findEntry(ctx.build.weapons, stored.id, 'Weapon', issues);

      if (entry !== null) {
        result = acceptOffhand(ctx, 'weapon', resolveWeaponEntry(ctx.data, entry, 'offhand'));
      }
    }
  }

  return result;
}

/**
 * Resolves one gear swap against the game data: every configured source becomes contributions,
 * dangling references and incompatible picks become issues (plan B7.1). Pure and cheap: per-entry
 * work is memoised on the entry objects, so only the concatenation runs per call.
 */
export function resolveGearSwap(
  data: GameData,
  build: BuildState,
  swap: GearSwap,
  options: EngineOptions = DEFAULT_ENGINE_OPTIONS,
): ResolvedCharacter {
  const level = build.character.level;
  const job = jobAtLevel(data, build.character.jobId, level);
  const gear: GearContext = { data, build, job, level };
  const issues: EngineIssue[] = [];
  const contributions: Contribution[] = [];
  const statPage = resolveStatPage(build, swap, issues);

  const weaponEntry = findEntry(build.weapons, swap.weaponId, 'Weapon', issues);
  const mainhand = usableMainhand(
    gear,
    weaponEntry === null ? null : resolveWeaponEntry(data, weaponEntry, 'mainhand'),
    issues,
  );
  const mainhandItem = mainhand?.item ?? DEFAULT_WEAPON;
  const mainhandUpgrade = mainhand !== null && mainhand.item !== null ? mainhand.upgrade : 0;
  const offhand = resolveOffhand(gear, swap.offhand, mainhandItem, issues);

  const equipmentEntry = findEntry(
    build.equipmentSets,
    swap.equipmentSetId,
    'Equipment set',
    issues,
  );
  const equipment = usableEquipment(
    gear,
    equipmentEntry === null ? null : resolveEquipmentSetEntry(data, equipmentEntry),
    issues,
  );
  const accessoryEntry = findEntry(
    build.accessorySets,
    swap.accessorySetId,
    'Accessory set',
    issues,
  );
  const accessories =
    accessoryEntry === null ? null : resolveAccessorySetEntry(data, accessoryEntry);
  const fashionEntry = findEntry(build.fashionSets, swap.fashionSetId, 'Fashion set', issues);
  const fashion = fashionEntry === null ? null : resolveFashionSetEntry(data, fashionEntry);
  const petEntry = findEntry(build.pets, swap.petId, 'Pet', issues);
  const pet = petEntry === null ? null : resolvePetEntry(data, petEntry);
  const grace = petEntry !== null && options.petGrace ? resolvePetGrace(data, petEntry) : null;
  const mask = collectMask(data, swap.maskItemId);
  const buffs = resolveBuffs(data, build.buffs, build.character.level);

  // Grouped by source in Flyffulator's slot order (flyffentity.js:14-33), then the swap-wide
  // sources in its aggregation order (flyffentity.js:1328-1512).
  const sources: readonly (Collected | null)[] = [
    mainhand,
    offhand,
    equipment,
    accessories,
    fashion,
    mask,
    pet,
    grace,
    buffs,
  ];

  for (const source of sources) {
    if (source !== null) {
      contributions.push(...source.contributions);
      issues.push(...source.issues);
    }
  }

  const armorPieces: EquippedItem[] = [...(equipment?.pieces ?? [])];

  if (offhand.offhand?.kind === 'shield') {
    armorPieces.push({ item: offhand.offhand.item, upgrade: offhand.offhand.upgrade });
  }

  return {
    job,
    level,
    statPage,
    contributions,
    mainhand: mainhandItem,
    mainhandUpgrade,
    offhand: offhand.offhand,
    armorPieces,
    armorSetUpgradeLevel: equipment !== null && equipment.set !== null ? equipment.upgrade : 0,
    hasUpcutStone: buffs.hasUpcutStone,
    petGrace: grace?.grace ?? null,
    issues,
  };
}
