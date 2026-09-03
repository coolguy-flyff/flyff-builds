import { describe, expect, it } from 'vitest';

import { loadBundledGameData, requireItem } from '@/data';
import { createAccessorySetEntry } from '@/domain/build/defaults';
import type { AccessorySetEntry } from '@/domain/build/schema';
import { findAccessorySet } from '@/domain/rules';
import { requireDefined } from '@/lib/assert';

import { ENGINE_ISSUE_CODES } from '../issues';
import { resolveAccessorySetEntry } from './accessorySet';

const data = loadBundledGameData();
const ADEPTS_SET = 12670;
const DEFENDERS_SET = 16809;
/** The Speedo earring line (id of "Speedo +1") and its "+5" item. */
const SPEEDO_LINE = 2470;
const SPEEDO_PLUS_5 = 16412;

function bonusLabels(entry: AccessorySetEntry): string[] {
  return resolveAccessorySetEntry(data, entry)
    .contributions.filter((line) => line.origin.kind === 'accessorySetBonus')
    .map((line) => line.origin.label);
}

describe('mixed accessory sets', () => {
  const adepts = requireDefined(findAccessorySet(data, ADEPTS_SET), "Adept's");
  const defenders = requireDefined(findAccessorySet(data, DEFENDERS_SET), "Defender's");
  const full = createAccessorySetEntry(1, ADEPTS_SET);

  it('counts a full set for both bonus tiers', () => {
    expect(new Set(bonusLabels(full))).toEqual(
      new Set([`${adepts.name} (4 pieces)`, `${adepts.name} (5 pieces)`]),
    );
  });

  it('reads an overridden piece from its own set and counts bonuses per set', () => {
    const mixed: AccessorySetEntry = {
      ...full,
      pieceSources: { ...full.pieceSources, ring2: DEFENDERS_SET },
    };
    const resolution = resolveAccessorySetEntry(data, mixed);
    const ring2 = resolution.contributions.filter((line) => line.origin.kind === 'ring2');

    expect(ring2.every((line) => line.origin.itemId === defenders.ring)).toBe(true);
    expect(ring2.some((line) => line.parameter === 'sta')).toBe(true);
    // Four Adept's pieces keep the 4-piece bonus; one Defender's ring earns nothing.
    expect(bonusLabels(mixed)).toEqual([`${adepts.name} (4 pieces)`]);
    expect(resolution.issues).toEqual([]);
  });

  it('earns no set bonus when no set reaches four pieces', () => {
    const split: AccessorySetEntry = {
      ...full,
      pieceSources: { ...full.pieceSources, ring1: DEFENDERS_SET, ring2: DEFENDERS_SET },
    };

    expect(bonusLabels(split)).toEqual([]);
  });

  it('wears a CW jewel at its tier without counting it towards any set', () => {
    const speedo: AccessorySetEntry = {
      ...full,
      pieceSources: { ...full.pieceSources, earring2: SPEEDO_LINE },
      upgrades: { ...full.upgrades, earring2: 5 },
    };
    const resolution = resolveAccessorySetEntry(data, speedo);
    const earring2 = resolution.contributions.filter((line) => line.origin.kind === 'earring2');

    // Speedo +5: block +21%, and the item's own name is the label.
    expect(earring2).toEqual([
      expect.objectContaining({ parameter: 'block', add: 21, rate: true }),
    ]);
    expect(earring2[0]?.origin).toMatchObject({ label: 'Speedo +5', itemId: SPEEDO_PLUS_5 });
    expect(bonusLabels(speedo)).toEqual([`${adepts.name} (4 pieces)`]);
    expect(resolution.issues).toEqual([]);
  });

  it('warns about a source the piece cannot wear and leaves the slot empty', () => {
    // Speedo is an earring line, not a ring.
    const wrongSlot: AccessorySetEntry = {
      ...full,
      pieceSources: { ...full.pieceSources, ring1: SPEEDO_LINE },
    };
    const resolution = resolveAccessorySetEntry(data, wrongSlot);

    expect(resolution.contributions.some((line) => line.origin.kind === 'ring1')).toBe(false);
    expect(resolution.issues).toEqual([
      expect.objectContaining({ code: ENGINE_ISSUE_CODES.unknownItem }),
    ]);
  });

  it('lets a Peision necklace come from a set that has one', () => {
    const peision: AccessorySetEntry = {
      ...full,
      necklace: 'peision',
      pieceSources: { ...full.pieceSources, necklace: DEFENDERS_SET },
    };
    const resolution = resolveAccessorySetEntry(data, peision);
    const necklace = resolution.contributions.find((line) => line.origin.kind === 'necklace');

    expect(necklace?.origin.itemId).toBe(defenders.necklaces.peision);
    expect(requireItem(data, defenders.necklaces.peision ?? 0).name).toContain('Peision');
    expect(resolution.issues).toEqual([]);
  });
});
