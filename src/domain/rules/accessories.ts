import type {
  Ability,
  AccessoryLine,
  AccessoryLineTier,
  AccessorySet,
  AccessorySlot,
  GameData,
  NecklaceVariant,
  SlimItem,
} from '@/data';
import { requireDefined } from '@/lib/assert';
import { clamp } from '@/lib/math';

import {
  ACCESSORY_PIECE_KEYS,
  MAX_UPGRADE_LEVEL,
  type AccessoryPieceKey,
  type AccessorySetEntry,
} from '../build/schema';

/**
 * Mixed accessory sets (plan feedback 2026-09-03): each piece follows the entry's set unless it
 * carries its own source — another set, or one of the standalone CW jewel lines (Speedo, Strente,
 * Pep, …). Everything that reads a piece's source goes through here so the editor, the auto-name
 * and the engine agree on what a piece is.
 */

/** Where a piece is taken from: an accessory set (variant + upgrade 0…10) or a CW jewel line. */
export type AccessoryPieceSource =
  | { readonly kind: 'set'; readonly set: AccessorySet }
  | { readonly kind: 'line'; readonly line: AccessoryLine };

export interface AccessoryUpgradeBounds {
  readonly min: number;
  readonly max: number;
}

/** One part of an entry: a source and the pieces worn from it, in wear order. */
export interface AccessoryPart {
  readonly source: AccessoryPieceSource;
  readonly pieces: readonly AccessoryPieceKey[];
}

const PIECE_SLOTS: Readonly<Record<AccessoryPieceKey, AccessorySlot>> = {
  ring1: 'ring',
  ring2: 'ring',
  earring1: 'earring',
  earring2: 'earring',
  necklace: 'necklace',
};

export function accessorySlotOf(piece: AccessoryPieceKey): AccessorySlot {
  return PIECE_SLOTS[piece];
}

/** The game id of what a piece is taken from: its own source, else the entry's set. */
export function accessoryPieceSourceId(
  entry: AccessorySetEntry,
  piece: AccessoryPieceKey,
): number | null {
  return entry.pieceSources[piece] ?? entry.setId;
}

export function findAccessorySet(data: GameData, setId: number | null): AccessorySet | null {
  return setId === null
    ? null
    : (data.accessorySets.find((candidate) => candidate.id === setId) ?? null);
}

export function findAccessoryLine(data: GameData, lineId: number | null): AccessoryLine | null {
  return lineId === null
    ? null
    : (data.accessoryLines.find((candidate) => candidate.id === lineId) ?? null);
}

/** Resolves a set-or-line id; the two tables never share an id (the data pipeline asserts it). */
export function findAccessoryPieceSource(
  data: GameData,
  id: number | null,
): AccessoryPieceSource | null {
  let source: AccessoryPieceSource | null = null;
  const set = findAccessorySet(data, id);

  if (set !== null) {
    source = { kind: 'set', set };
  } else {
    const line = findAccessoryLine(data, id);

    if (line !== null) {
      source = { kind: 'line', line };
    }
  }

  return source;
}

/** Whether a source can be worn as a piece: a set covers every slot, a CW jewel line only its own. */
export function fitsAccessoryPiece(
  source: AccessoryPieceSource,
  piece: AccessoryPieceKey,
): boolean {
  return source.kind === 'set' || source.line.slot === accessorySlotOf(piece);
}

/** What a piece is taken from; null when empty, unknown, or a line of another slot. */
export function accessoryPieceSource(
  data: GameData,
  entry: AccessorySetEntry,
  piece: AccessoryPieceKey,
): AccessoryPieceSource | null {
  const source = findAccessoryPieceSource(data, accessoryPieceSourceId(entry, piece));

  return source !== null && fitsAccessoryPiece(source, piece) ? source : null;
}

/** The set a piece belongs to; null for a CW jewel or an empty piece. */
export function accessoryPieceSet(
  data: GameData,
  entry: AccessorySetEntry,
  piece: AccessoryPieceKey,
): AccessorySet | null {
  const source = accessoryPieceSource(data, entry, piece);

  return source?.kind === 'set' ? source.set : null;
}

/** The item worn in a piece slot of a set, honouring the entry's variants. */
export function accessorySetPieceItemId(
  set: AccessorySet,
  entry: AccessorySetEntry,
  piece: AccessoryPieceKey,
): number | undefined {
  let itemId: number | undefined;

  switch (piece) {
    case 'ring1':
    case 'ring2':
      itemId = set.ring;
      break;
    case 'earring1':
      itemId = set.earrings[entry.earring1];
      break;
    case 'earring2':
      itemId = set.earrings[entry.earring2];
      break;
    case 'necklace':
      itemId = set.necklaces[entry.necklace];
      break;
  }

  return itemId;
}

function firstTier(line: AccessoryLine): AccessoryLineTier {
  return requireDefined(line.tiers[0], `Accessory line ${line.name} has no tiers`);
}

function lastTier(line: AccessoryLine): AccessoryLineTier {
  return requireDefined(line.tiers.at(-1), `Accessory line ${line.name} has no tiers`);
}

/** Upgrade range of a piece: 0…10 on a set piece, the line's tiers on a CW jewel ("+1"…"+5"). */
export function accessoryUpgradeBounds(
  source: AccessoryPieceSource | null,
): AccessoryUpgradeBounds {
  let bounds: AccessoryUpgradeBounds = { min: 0, max: MAX_UPGRADE_LEVEL };

  if (source?.kind === 'line') {
    bounds = { min: firstTier(source.line).upgrade, max: lastTier(source.line).upgrade };
  }

  return bounds;
}

export function clampAccessoryUpgrade(
  source: AccessoryPieceSource | null,
  upgrade: number,
): number {
  const bounds = accessoryUpgradeBounds(source);

  return clamp(upgrade, bounds.min, bounds.max);
}

/** The tier a CW jewel line is worn at (tiers are contiguous, so the upgrade indexes them). */
export function accessoryLineTier(line: AccessoryLine, upgrade: number): AccessoryLineTier {
  const index = clampAccessoryUpgrade({ kind: 'line', line }, upgrade) - firstTier(line).upgrade;

  return requireDefined(line.tiers[index], `Accessory line ${line.name} has no tier ${upgrade}`);
}

/**
 * The item a piece resolves to; undefined when the piece has no source, its set lacks the variant
 * (no Peision necklace on Adept's) or its source id is unknown.
 */
export function accessoryPieceItemId(
  data: GameData,
  entry: AccessorySetEntry,
  piece: AccessoryPieceKey,
): number | undefined {
  const source = accessoryPieceSource(data, entry, piece);
  let itemId: number | undefined;

  if (source?.kind === 'set') {
    itemId = accessorySetPieceItemId(source.set, entry, piece);
  } else if (source?.kind === 'line') {
    itemId = accessoryLineTier(source.line, entry.upgrades[piece]).itemId;
  }

  return itemId;
}

/**
 * What a piece grants at its upgrade: `upgradeLevels[u]` on a set piece (flyffentity.js:1224-1236);
 * a CW jewel's tier is its own item, so its plain abilities.
 */
export function accessoryPieceAbilities(
  source: AccessoryPieceSource,
  item: SlimItem,
  upgrade: number,
): readonly Ability[] {
  let abilities: readonly Ability[];

  if (source.kind === 'set') {
    abilities = requireDefined(
      item.upgradeLevels?.[upgrade],
      `${item.name} has no upgrade level ${upgrade}`,
    ).abilities;
  } else {
    abilities = item.abilities ?? [];
  }

  return abilities;
}

/** Whether any piece comes from somewhere other than the entry's set. */
export function hasMixedAccessoryPieces(entry: AccessorySetEntry): boolean {
  return ACCESSORY_PIECE_KEYS.some(
    (piece) => entry.pieceSources[piece] !== null && entry.pieceSources[piece] !== entry.setId,
  );
}

/**
 * The entry's parts: its own set first (while any piece still follows it), then the other sources
 * in wear order of first appearance. Unknown source ids are skipped — `validateBuild` drops them.
 */
export function accessoryParts(data: GameData, entry: AccessorySetEntry): readonly AccessoryPart[] {
  const partsBySource = new Map<
    number,
    { source: AccessoryPieceSource; pieces: AccessoryPieceKey[] }
  >();

  for (const piece of ACCESSORY_PIECE_KEYS) {
    const source = accessoryPieceSource(data, entry, piece);

    if (source !== null) {
      const sourceId = source.kind === 'set' ? source.set.id : source.line.id;
      const part = partsBySource.get(sourceId) ?? { source, pieces: [] };

      part.pieces.push(piece);
      partsBySource.set(sourceId, part);
    }
  }

  // Stable sort: the entry's set first, everything else keeps its wear-order appearance.
  return [...partsBySource.entries()]
    .sort(([a], [b]) => Number(b === entry.setId) - Number(a === entry.setId))
    .map(([, part]) => part);
}

/** The necklace variants a set offers (Peision exists only on Defender's and Champion's). */
export function necklaceVariantsOf(set: AccessorySet | null): readonly NecklaceVariant[] {
  const variants: NecklaceVariant[] = ['gore', 'mental'];

  if (set === null || set.necklaces.peision !== undefined) {
    variants.push('peision');
  }

  return variants;
}
