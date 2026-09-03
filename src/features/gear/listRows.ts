import { getItem, type GameData } from '@/data';
import {
  accessorySetShortName,
  formatAbility,
  itemShortName,
  stackTotals,
  type AccessoryPieceKey,
  type AccessorySetEntry,
  type BuildState,
  type EquipmentSetEntry,
  type FashionSetEntry,
  type GearListKey,
  type Issue,
  type PetEntry,
  type SetStatAwake,
  type ShieldEntry,
  type Stack,
  type StatAwake,
  type WeaponEntry,
} from '@/domain/build';
import {
  accessoryParts,
  accessoryPieceSource,
  setAwakeTotals,
  statAwakeTotals,
  type AccessoryPart,
} from '@/domain/rules';
import type { EntityListChip } from '@/components/EntityList';
import { rarityClassName } from '@/components/rarity';

import {
  capitalize,
  formatStatTotals,
  isSkillDamageAwake,
  skillAwakeParameterLabel,
} from './format';

/**
 * What a gear list row shows besides its name (plan D3): an item icon, the name colour and the
 * summary chips — always derived from the data, never typed.
 */
export interface EntryRow {
  readonly id: number;
  /** Item icon file name, or null for a placeholder tile. */
  readonly icon: string | null;
  readonly nameClassName: string;
  readonly chips: readonly EntityListChip[];
  /** Why the entry contributes nothing yet ("No weapon selected"), or null once it is complete. */
  readonly missing: string | null;
}

const PLAIN_NAME = 'text-text';

function chip(label: string): EntityListChip {
  return { label };
}

function awakeChips(awake: StatAwake): EntityListChip[] {
  return formatStatTotals(statAwakeTotals(awake)).map(chip);
}

function setAwakeChips(awake: SetStatAwake): EntityListChip[] {
  return formatStatTotals(setAwakeTotals(awake)).map(chip);
}

function stackChips(data: GameData, stacks: readonly Stack[]): EntityListChip[] {
  return stackTotals(data, stacks).map((ability) =>
    chip(formatAbility(data, ability.parameter, ability.add, ability.rate)),
  );
}

function skillAwakeChips(data: GameData, entry: WeaponEntry | ShieldEntry): EntityListChip[] {
  let chips: EntityListChip[] = [];

  if (entry.skillAwake !== null) {
    const { parameter, value } = entry.skillAwake;
    chips = isSkillDamageAwake(parameter)
      ? [chip(`${skillAwakeParameterLabel(data, parameter)} +${value}%`)]
      : [chip(formatAbility(data, parameter, value, true))];
  }

  return chips;
}

/** EntityList keys chips by label, so repeated facts collapse into one chip. */
function dedupe(chips: readonly EntityListChip[]): EntityListChip[] {
  const seen = new Set<string>();

  return chips.filter((candidate) => {
    const isNew = !seen.has(candidate.label);
    seen.add(candidate.label);

    return isNew;
  });
}

export function describeEquipmentSet(data: GameData, entry: EquipmentSetEntry): EntryRow {
  const set = entry.setId === null ? undefined : data.armorSets.get(entry.setId);
  const suit = set === undefined ? undefined : getItem(data, set.parts.suit);

  return {
    id: entry.id,
    icon: suit?.icon ?? null,
    nameClassName: PLAIN_NAME,
    chips: dedupe([
      ...(set === undefined ? [] : [chip(`+${entry.upgrade}`)]),
      ...setAwakeChips(entry.statAwake),
      ...stackChips(data, entry.suitCards),
    ]),
    missing: set === undefined ? 'No set selected' : null,
  };
}

export function describeWeapon(data: GameData, entry: WeaponEntry): EntryRow {
  const item = entry.itemId === null ? undefined : getItem(data, entry.itemId);

  return {
    id: entry.id,
    icon: item?.icon ?? null,
    nameClassName: item === undefined ? PLAIN_NAME : rarityClassName(item.rarity),
    chips: dedupe([
      ...(item === undefined ? [] : [chip(`+${entry.upgrade}`)]),
      ...awakeChips(entry.statAwake),
      ...skillAwakeChips(data, entry),
      ...stackChips(data, entry.jewels),
      ...stackChips(data, entry.cards),
    ]),
    missing: item === undefined ? 'No weapon selected' : null,
  };
}

export function describeShield(data: GameData, entry: ShieldEntry): EntryRow {
  const item = entry.itemId === null ? undefined : getItem(data, entry.itemId);

  return {
    id: entry.id,
    icon: item?.icon ?? null,
    nameClassName: item === undefined ? PLAIN_NAME : rarityClassName(item.rarity),
    chips: dedupe([
      ...(item === undefined ? [] : [chip(`+${entry.upgrade}`)]),
      ...awakeChips(entry.statAwake),
      ...skillAwakeChips(data, entry),
      ...stackChips(data, entry.cards),
    ]),
    missing: item === undefined ? 'No shield selected' : null,
  };
}

/** "Defender's", "Speedo" — a part as the chips name it. */
function accessoryPartName(part: AccessoryPart): string {
  return part.source.kind === 'set'
    ? accessorySetShortName(part.source.set.name)
    : part.source.line.name;
}

function accessoryPartIcon(data: GameData, part: AccessoryPart): string | null {
  return part.source.kind === 'set'
    ? (getItem(data, part.source.set.ring)?.icon ?? null)
    : part.source.line.icon;
}

/** "Plug", "Gore" — or the line's name for a CW jewel, which has no set variant ("Speedo", "Pep"). */
function accessoryVariantLabel(
  data: GameData,
  entry: AccessorySetEntry,
  piece: AccessoryPieceKey,
  variant: string,
): string {
  const source = accessoryPieceSource(data, entry, piece);

  return source?.kind === 'line' ? source.line.name : capitalize(variant);
}

/** "+10" and the necklace type for a uniform upgrade, else the per-slot breakdown. */
function accessoryUpgradeChips(data: GameData, entry: AccessorySetEntry): EntityListChip[] {
  const { ring1, ring2, earring1, earring2, necklace } = entry.upgrades;
  const allEqual = [ring2, earring1, earring2, necklace].every((upgrade) => upgrade === ring1);
  const variant = (piece: AccessoryPieceKey, value: string): string =>
    accessoryVariantLabel(data, entry, piece, value);
  let chips: EntityListChip[];

  if (allEqual) {
    chips = [chip(`+${ring1}`), chip(variant('necklace', entry.necklace))];
  } else {
    chips = [
      chip(`R ${ring1}/${ring2}`),
      chip(
        `E ${variant('earring1', entry.earring1)} ${earring1} / ${variant('earring2', entry.earring2)} ${earring2}`,
      ),
      chip(`N ${variant('necklace', entry.necklace)} ${necklace}`),
    ];
  }

  return chips;
}

export function describeAccessorySet(data: GameData, entry: AccessorySetEntry): EntryRow {
  const parts = accessoryParts(data, entry);
  const [firstPart] = parts;
  const ownSet = parts.find(
    (part) => part.source.kind === 'set' && part.source.set.id === entry.setId,
  );
  const mixedIn = parts.filter((part) => part !== ownSet);
  const chips: EntityListChip[] = [];

  if (firstPart !== undefined) {
    if (ownSet !== undefined) {
      chips.push(chip(accessoryPartName(ownSet)));
    }

    chips.push(
      ...accessoryUpgradeChips(data, entry),
      ...mixedIn.map((part) => chip(`${part.pieces.length}× ${accessoryPartName(part)}`)),
    );
  }

  return {
    id: entry.id,
    icon: firstPart === undefined ? null : accessoryPartIcon(data, firstPart),
    nameClassName: PLAIN_NAME,
    chips,
    missing: firstPart === undefined ? 'No set selected' : null,
  };
}

/** Icon for a fashion set without a cloak (the game's fashion scroll box). */
const FASHION_FALLBACK_ICON = 'syssysscrbxluck.png';

export function describeFashionSet(data: GameData, entry: FashionSetEntry): EntryRow {
  const cloak = entry.cloakItemId === null ? undefined : getItem(data, entry.cloakItemId);
  const blessings = entry.blessings.map((line) =>
    chip(
      formatAbility(
        data,
        line.parameter,
        line.total,
        data.blessings[line.parameter]?.rate ?? false,
      ),
    ),
  );

  return {
    id: entry.id,
    icon: cloak?.icon ?? FASHION_FALLBACK_ICON,
    nameClassName: PLAIN_NAME,
    chips: dedupe([
      chip(`${entry.speedPercent}% spd`),
      ...blessings,
      ...(cloak === undefined ? [] : [chip(itemShortName(cloak.name))]),
    ]),
    // Fashion always contributes its set speed, so it is never incomplete.
    missing: null,
  };
}

export function describePet(data: GameData, entry: PetEntry): EntryRow {
  const def = data.pets.find((pet) => pet.petItemId === entry.petItemId);
  const cage = entry.petItemId === null ? undefined : getItem(data, entry.petItemId);

  return {
    id: entry.id,
    icon: cage?.icon ?? null,
    nameClassName: PLAIN_NAME,
    chips:
      def === undefined ? [] : [chip(formatAbility(data, def.parameter, entry.total, def.rate))],
    missing: def === undefined ? 'No pet selected' : null,
  };
}

export function describeGearEntries(
  data: GameData,
  build: BuildState,
  list: GearListKey,
): EntryRow[] {
  let rows: EntryRow[];

  switch (list) {
    case 'equipmentSets':
      rows = build.equipmentSets.map((entry) => describeEquipmentSet(data, entry));
      break;
    case 'weapons':
      rows = build.weapons.map((entry) => describeWeapon(data, entry));
      break;
    case 'shields':
      rows = build.shields.map((entry) => describeShield(data, entry));
      break;
    case 'accessorySets':
      rows = build.accessorySets.map((entry) => describeAccessorySet(data, entry));
      break;
    case 'fashionSets':
      rows = build.fashionSets.map((entry) => describeFashionSet(data, entry));
      break;
    case 'pets':
      rows = build.pets.map((entry) => describePet(data, entry));
      break;
  }

  return rows;
}

/** Amber "⚠ 9/7 jewels" chips from an entry's issues (the full message is the tooltip). */
export function issueChips(issues: readonly Issue[]): EntityListChip[] {
  return issues.map((issue) => ({
    label: `⚠ ${issue.message.split(' — ')[0] ?? issue.message}`,
    tone: issue.severity === 'error' ? 'danger' : 'warn',
  }));
}
