import { getItem, type GameData } from '@/data';
import {
  accessorySetShortName,
  formatAbility,
  itemShortName,
  stackTotals,
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
import { setAwakeTotals, statAwakeTotals } from '@/domain/rules';
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
  };
}

export function describeAccessorySet(data: GameData, entry: AccessorySetEntry): EntryRow {
  const set = data.accessorySets.find((candidate) => candidate.id === entry.setId);
  const ring = set === undefined ? undefined : getItem(data, set.ring);
  const { ring1, ring2, earring1, earring2, necklace } = entry.upgrades;
  const allEqual = [ring2, earring1, earring2, necklace].every((upgrade) => upgrade === ring1);
  let chips: EntityListChip[];

  if (set === undefined) {
    chips = [];
  } else if (allEqual) {
    chips = [chip(`+${ring1}`), chip(capitalize(entry.necklace))];
  } else {
    chips = [
      chip(`R ${ring1}/${ring2}`),
      chip(
        `E ${capitalize(entry.earring1)} ${earring1} / ${capitalize(entry.earring2)} ${earring2}`,
      ),
      chip(`N ${capitalize(entry.necklace)} ${necklace}`),
    ];
  }

  return {
    id: entry.id,
    icon: ring?.icon ?? null,
    nameClassName: PLAIN_NAME,
    chips: chips.length === 0 ? [] : [chip(accessorySetShortName(set?.name ?? '')), ...chips],
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
