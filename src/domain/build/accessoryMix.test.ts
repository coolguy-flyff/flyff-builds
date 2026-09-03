import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { requireDefined } from '@/lib/assert';

import {
  accessoryLineTier,
  accessoryParts,
  accessoryPieceItemId,
  accessoryPieceSet,
  accessoryPieceSource,
  accessoryUpgradeBounds,
  findAccessoryLine,
  hasMixedAccessoryPieces,
  necklaceVariantsOf,
} from '../rules/accessories';
import { createAccessorySetEntry, createDefaultBuild } from './defaults';
import { autoAccessorySetName } from './naming';
import type { AccessoryPieceSources, AccessorySetEntry, AccessoryUpgrades } from './schema';
import { repairBuild } from './validate';

const data = loadBundledGameData();
const ADEPTS_SET = 12670;
const DEFENDERS_SET = 16809;
const CHAMPIONS_SET = 17716;
/** CW jewel lines are identified by their lowest tier's item id. */
const SPEEDO = 2470;
const PEP = 4902;
const METEOFY = 5275;
const STRENTE = 5371;
const SPEEDO_PLUS_5 = 16412;

function mixed(
  sources: Partial<AccessoryPieceSources>,
  upgrades: Partial<AccessoryUpgrades> = {},
): AccessorySetEntry {
  const entry = createAccessorySetEntry(3, ADEPTS_SET);

  return {
    ...entry,
    pieceSources: { ...entry.pieceSources, ...sources },
    upgrades: { ...entry.upgrades, ...upgrades },
  };
}

function partLabel(part: ReturnType<typeof accessoryParts>[number]): string {
  return part.source.kind === 'set' ? part.source.set.name : part.source.line.name;
}

describe('accessory piece rules', () => {
  it('resolves each piece to its own source or the entry set', () => {
    const entry = mixed({ ring2: DEFENDERS_SET, earring2: SPEEDO });

    expect(accessoryPieceSet(data, entry, 'ring1')?.id).toBe(ADEPTS_SET);
    expect(accessoryPieceSet(data, entry, 'ring2')?.id).toBe(DEFENDERS_SET);
    expect(accessoryPieceSet(data, entry, 'earring2')).toBeNull();
    expect(accessoryPieceSource(data, entry, 'earring2')).toMatchObject({
      kind: 'line',
      line: { name: 'Speedo', slot: 'earring' },
    });
    expect(hasMixedAccessoryPieces(entry)).toBe(true);
    expect(hasMixedAccessoryPieces(mixed({ ring2: ADEPTS_SET }))).toBe(false);
  });

  it('groups the pieces into parts, the entry set first, then by first appearance', () => {
    const parts = accessoryParts(
      data,
      mixed({ ring1: DEFENDERS_SET, ring2: DEFENDERS_SET, earring2: SPEEDO, necklace: PEP }),
    );

    expect(parts.map((part) => [partLabel(part), part.pieces])).toEqual([
      ["Adept's Set", ['earring1']],
      ["Defender's Set", ['ring1', 'ring2']],
      ['Pep', ['necklace']],
      ['Speedo', ['earring2']],
    ]);
  });

  it('wears a CW jewel at its tier and bounds the upgrade to the line', () => {
    const entry = mixed({ earring2: SPEEDO, ring1: METEOFY }, { earring2: 5 });
    const speedo = requireDefined(findAccessoryLine(data, SPEEDO), 'Speedo');

    expect(accessoryPieceItemId(data, entry, 'earring2')).toBe(SPEEDO_PLUS_5);
    expect(accessoryPieceItemId(data, entry, 'ring1')).toBe(METEOFY);
    expect(accessoryUpgradeBounds(accessoryPieceSource(data, entry, 'earring2'))).toEqual({
      min: 1,
      max: 5,
    });
    // Meteofy is a single item: no tiers to step through.
    expect(accessoryUpgradeBounds(accessoryPieceSource(data, entry, 'ring1'))).toEqual({
      min: 0,
      max: 0,
    });
    expect(accessoryUpgradeBounds(accessoryPieceSource(data, entry, 'ring2'))).toEqual({
      min: 0,
      max: 10,
    });
    expect(accessoryLineTier(speedo, 9).upgrade).toBe(5);
    expect(accessoryLineTier(speedo, 0).upgrade).toBe(1);
  });

  it('ignores a line worn in the wrong slot', () => {
    // Speedo is an earring line; as a ring it resolves to nothing.
    const entry = mixed({ ring1: SPEEDO });

    expect(accessoryPieceSource(data, entry, 'ring1')).toBeNull();
    expect(accessoryPieceItemId(data, entry, 'ring1')).toBeUndefined();
    expect(accessoryParts(data, entry).map(partLabel)).toEqual(["Adept's Set"]);
  });

  it('picks the piece item by variant and offers Peision only where it exists', () => {
    const adepts = accessoryPieceSet(data, mixed({}), 'ring1');
    const defenders = accessoryPieceSet(data, mixed({ necklace: DEFENDERS_SET }), 'necklace');

    expect(adepts).not.toBeNull();
    expect(defenders).not.toBeNull();

    if (adepts === null || defenders === null) {
      return;
    }

    const entry = { ...mixed({}), earring1: 'demol' as const, necklace: 'mental' as const };

    expect(accessoryPieceItemId(data, entry, 'earring1')).toBe(adepts.earrings.demol);
    expect(accessoryPieceItemId(data, entry, 'necklace')).toBe(adepts.necklaces.mental);
    expect(necklaceVariantsOf(adepts)).toEqual(['gore', 'mental']);
    expect(necklaceVariantsOf(defenders)).toEqual(['gore', 'mental', 'peision']);
    expect(necklaceVariantsOf(null)).toEqual(['gore', 'mental', 'peision']);
  });
});

describe('naming and validation of mixed sets', () => {
  it('names a mix by part abbreviations and the usual upgrade signature', () => {
    expect(autoAccessorySetName(data, mixed({ ring2: DEFENDERS_SET }))).toBe('Clean Adept/Def');
    expect(
      autoAccessorySetName(
        data,
        mixed(
          { ring1: DEFENDERS_SET, ring2: DEFENDERS_SET, necklace: CHAMPIONS_SET },
          { ring1: 10, ring2: 10, earring1: 10, earring2: 10, necklace: 10 },
        ),
      ),
    ).toBe('Adept/Def/Champ XXXXX');
    expect(autoAccessorySetName(data, mixed({ earring2: SPEEDO }, { earring2: 3 }))).toBe(
      'Adept/Speedo 00030',
    );
  });

  it('collapses two or more CW jewel lines into "CW"', () => {
    // 2× Adept's ring +10, Pep +5, 2× Speedo +5.
    expect(
      autoAccessorySetName(
        data,
        mixed(
          { earring1: SPEEDO, earring2: SPEEDO, necklace: PEP },
          { ring1: 10, ring2: 10, earring1: 5, earring2: 5, necklace: 5 },
        ),
      ),
    ).toBe('Adept/CW X555X');
    // No set at all: a Strente +5 and a Meteofy ring.
    expect(
      autoAccessorySetName(data, {
        ...mixed({ ring1: STRENTE, ring2: METEOFY }, { ring1: 5 }),
        setId: null,
      }),
    ).toBe('CW 50000');
  });

  it('drops unknown or wrong-slot sources, clamps tiers and keeps Peision only where it exists', () => {
    const build = {
      ...createDefaultBuild(data),
      nextId: 7,
      accessorySets: [
        mixed({ ring1: 424242 }),
        { ...mixed({ necklace: DEFENDERS_SET }), id: 4, necklace: 'peision' as const },
        {
          ...mixed({ necklace: ADEPTS_SET }),
          id: 5,
          setId: DEFENDERS_SET,
          necklace: 'peision' as const,
        },
        // Speedo is an earring line (dropped as a ring); Speedo +9 does not exist (clamped to +5).
        { ...mixed({ ring1: SPEEDO, earring2: SPEEDO }, { earring2: 9 }), id: 6 },
      ],
    };
    const { build: repaired, warnings } = repairBuild(data, build);

    expect(repaired.accessorySets[0]?.pieceSources.ring1).toBeNull();
    expect(repaired.accessorySets[1]?.necklace).toBe('peision');
    expect(repaired.accessorySets[2]?.necklace).toBe('gore');
    expect(repaired.accessorySets[3]?.pieceSources).toMatchObject({
      ring1: null,
      earring2: SPEEDO,
    });
    expect(repaired.accessorySets[3]?.upgrades.earring2).toBe(5);
    expect(warnings.map((warning) => warning.code)).toEqual([
      'unknown-set',
      'variant-unavailable',
      'unknown-set',
      'upgrade-clamped',
    ]);
  });
});
