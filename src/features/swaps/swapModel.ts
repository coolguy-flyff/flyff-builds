import { getItem, type GameData, type SlimItem } from '@/data';
import {
  armorSetShortName,
  itemShortName,
  type BuildState,
  type EntryListKey,
  type GearSwap,
  type Offhand,
} from '@/domain/build';
import { isOneHandedWeapon, offhandKind, type OffhandKind } from '@/domain/rules';
import type { SelectGroup, SelectOption } from '@/components/Select';
import { formatAbilityList } from '@/features/buffs/effectText';
import { memoByRef } from '@/lib/memo';

/**
 * View models for a gear swap card (plan A3.2): select options, the offhand rule and the
 * composition chips. Pure functions over the build so they are unit-testable without React.
 */

/** Resolves an entry id to its display name (the store's memoised `entryName`). */
export type EntryNamer = (list: EntryListKey, id: number) => string;

/** Select value of "— none —". */
export const NONE_VALUE = '';
/** Select value of the read-only row that shows an offhand the engine ignores. */
export const IGNORED_VALUE = 'ignored';

export const NONE_OPTION: SelectOption = { value: NONE_VALUE, label: '— none —' };

export function toSelectValue(id: number | null): string {
  return id === null ? NONE_VALUE : String(id);
}

export function fromSelectValue(value: string): number | null {
  return value === NONE_VALUE ? null : Number(value);
}

function pushEntryOptions(
  options: SelectOption[],
  list: EntryListKey,
  ids: readonly number[],
  nameOf: EntryNamer,
): void {
  for (const id of ids) {
    options.push({ value: toSelectValue(id), label: nameOf(list, id) });
  }
}

/** Options for one entry list, optionally preceded by "— none —". */
export function entryOptions(
  build: BuildState,
  list: EntryListKey,
  nameOf: EntryNamer,
  allowNone: boolean,
): SelectOption[] {
  const options: SelectOption[] = allowNone ? [NONE_OPTION] : [];

  pushEntryOptions(
    options,
    list,
    build[list].map((entry) => entry.id),
    nameOf,
  );

  return options;
}

/** The item of the swap's weapon entry; `null` for bare hands or an entry without an item. */
export function mainhandItem(data: GameData, build: BuildState, swap: GearSwap): SlimItem | null {
  const entry = build.weapons.find((weapon) => weapon.id === swap.weaponId);
  let item: SlimItem | null = null;

  if (entry !== undefined && entry.itemId !== null) {
    item = getItem(data, entry.itemId) ?? null;
  }

  return item;
}

function offhandList(kind: 'shield' | 'weapon'): 'shields' | 'weapons' {
  return kind === 'shield' ? 'shields' : 'weapons';
}

/** Weapon entries that can sit in the offhand: one-handed, with an item, other than the mainhand. */
function secondWeaponIds(data: GameData, build: BuildState, swap: GearSwap): number[] {
  const ids: number[] = [];

  for (const entry of build.weapons) {
    if (entry.id === swap.weaponId || entry.itemId === null) {
      continue;
    }

    const item = getItem(data, entry.itemId);
    const stored = swap.offhand?.kind === 'weapon' && swap.offhand.id === entry.id;

    if (stored || (item !== undefined && isOneHandedWeapon(item))) {
      ids.push(entry.id);
    }
  }

  return ids;
}

export interface OffhandModel {
  readonly kind: OffhandKind;
  readonly options: readonly SelectOption[];
  readonly value: string;
  readonly disabled: boolean;
  /** Dim caption under the select ("2H weapon — no offhand", "second weapon (dual wield)"). */
  readonly caption: string | null;
  /** The stored offhand is of another kind than the job/mainhand allow; the engine drops it. */
  readonly mismatch: boolean;
}

/**
 * The offhand select for a swap (plan A3.2): two-handed → disabled; Slayer → a second one-handed
 * weapon; everyone else → a shield. A stored offhand of the wrong kind stays visible as a
 * disabled "(ignored)" row so the user can see what the engine drops.
 */
export function offhandModel(
  data: GameData,
  build: BuildState,
  swap: GearSwap,
  nameOf: EntryNamer,
): OffhandModel {
  const kind = offhandKind(data, build.character.jobId, mainhandItem(data, build, swap));
  const stored = swap.offhand;
  const options: SelectOption[] = [NONE_OPTION];
  let value = NONE_VALUE;
  let mismatch = false;

  if (stored !== null && stored.kind !== kind) {
    mismatch = true;
    value = IGNORED_VALUE;
    options.push({
      value: IGNORED_VALUE,
      label: `${nameOf(offhandList(stored.kind), stored.id)} (ignored)`,
      disabled: true,
    });
  } else if (stored !== null) {
    value = toSelectValue(stored.id);
  }

  let caption: string | null = null;

  switch (kind) {
    case 'none':
      caption = '2H weapon — no offhand';
      break;
    case 'shield':
      pushEntryOptions(
        options,
        'shields',
        build.shields.map((entry) => entry.id),
        nameOf,
      );
      break;
    case 'weapon':
      caption = 'second weapon (dual wield)';
      pushEntryOptions(options, 'weapons', secondWeaponIds(data, build, swap), nameOf);
      break;
  }

  return { kind, options, value, disabled: kind === 'none', caption, mismatch };
}

/** The offhand to store for a select value; `null` for none and for the read-only ignored row. */
export function offhandFromValue(kind: OffhandKind, value: string): Offhand {
  const id = Number(value);
  let offhand: Offhand = null;

  if (kind !== 'none' && value !== NONE_VALUE && Number.isInteger(id)) {
    offhand = { kind, id };
  }

  return offhand;
}

/** Masks grouped by effect ("Attack +3%" → Cat Mask / Fox Mask / …), in data order. */
export const maskGroups = memoByRef((data: GameData): SelectGroup[] => {
  const groups = new Map<string, SelectOption[]>();

  for (const mask of data.masks) {
    const effect = formatAbilityList(data, mask.abilities ?? []);
    let options = groups.get(effect);

    if (options === undefined) {
      options = [];
      groups.set(effect, options);
    }

    options.push({ value: toSelectValue(mask.id), label: mask.name });
  }

  return [...groups].map(([label, options]) => ({ label, options }));
});

/** "Healing Statted Cat Mask" → "Healing mask"; other names are kept verbatim. */
export function maskShortName(name: string): string {
  const match = /^(.*?) Statted /.exec(name);
  const kind = match?.[1];

  return kind === undefined ? name : `${kind} mask`;
}

function upgradedItemName(
  data: GameData,
  itemId: number | null,
  upgrade: number,
  fallback: string,
): string {
  const item = itemId === null ? undefined : getItem(data, itemId);

  return item === undefined ? fallback : `${itemShortName(item.name)} +${upgrade}`;
}

function resolvedOffhandChip(data: GameData, build: BuildState, swap: GearSwap): string | null {
  const stored = swap.offhand;
  let chip: string | null = null;

  if (
    stored !== null &&
    stored.kind === offhandKind(data, build.character.jobId, mainhandItem(data, build, swap))
  ) {
    const entry =
      stored.kind === 'shield'
        ? build.shields.find((shield) => shield.id === stored.id)
        : build.weapons.find((weapon) => weapon.id === stored.id);

    if (entry !== undefined) {
      chip =
        entry.customName ??
        upgradedItemName(
          data,
          entry.itemId,
          entry.upgrade,
          stored.kind === 'shield' ? 'Shield' : 'Weapon',
        );
    }
  }

  return chip;
}

/**
 * Read-only chips summarising a swap's resolved picks (plan A3.2), in slot order. Custom entry
 * names win; otherwise gear is shortened to "<item> +<upgrade>". An ignored offhand is skipped.
 */
export function compositionChips(
  data: GameData,
  build: BuildState,
  swap: GearSwap,
  nameOf: EntryNamer,
): string[] {
  const chips: string[] = [];
  const equipment = build.equipmentSets.find((entry) => entry.id === swap.equipmentSetId);

  if (equipment !== undefined) {
    const set = equipment.setId === null ? undefined : data.armorSets.get(equipment.setId);
    const auto =
      set === undefined ? 'Equipment set' : `${armorSetShortName(set.name)} +${equipment.upgrade}`;
    chips.push(equipment.customName ?? auto);
  }

  const weapon = build.weapons.find((entry) => entry.id === swap.weaponId);

  if (weapon !== undefined) {
    chips.push(
      weapon.customName ?? upgradedItemName(data, weapon.itemId, weapon.upgrade, 'Weapon'),
    );
  }

  const offhand = resolvedOffhandChip(data, build, swap);

  if (offhand !== null) {
    chips.push(offhand);
  }

  if (swap.accessorySetId !== null) {
    chips.push(nameOf('accessorySets', swap.accessorySetId));
  }

  if (swap.fashionSetId !== null) {
    chips.push(nameOf('fashionSets', swap.fashionSetId));
  }

  if (swap.petId !== null) {
    chips.push(nameOf('pets', swap.petId));
  }

  const mask = swap.maskItemId === null ? undefined : getItem(data, swap.maskItemId);

  if (mask !== undefined) {
    chips.push(maskShortName(mask.name));
  }

  chips.push(nameOf('statPages', swap.statPageId));

  return chips;
}
