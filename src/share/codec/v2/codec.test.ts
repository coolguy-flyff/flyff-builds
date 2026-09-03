import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createAccessorySetEntry, createDefaultBuild } from '@/domain/build/defaults';
import type { BuildState } from '@/domain/build/schema';
import { requireDefined } from '@/lib/assert';

import { encodeBase64Url } from '../../base64url';
import { decodeShareCode } from '../../index';
import { decodeErrorCode } from '../../testing/errors';
import { FIXTURE_IDS, maximalBuild, withoutV2Fields } from '../../testing/fixtures';
import { renumberIds } from '../../testing/ids';
import { decodeV1 } from '../v1/decode';
import { encodeV1 } from '../v1/encode';

import { decodeV2 } from './decode';
import { encodeV2 } from './encode';

const data = loadBundledGameData();
const V1_ENVELOPE = [1, 0];

/** A share code in the v1 envelope around a v1 body, as links shared before v2 look. */
function v1ShareCode(build: BuildState): string {
  const body = encodeV1(build);
  const code = new Uint8Array(V1_ENVELOPE.length + body.length);

  code.set(V1_ENVELOPE);
  code.set(body, V1_ENVELOPE.length);

  return encodeBase64Url(code);
}

describe('encodeV2 / decodeV2', () => {
  it('round-trips the maximal build, mixed accessory sets and class skills included', () => {
    const build = maximalBuild(data);
    const bytes = encodeV2(build);
    const decoded = decodeV2(bytes);

    expect(decoded).toStrictEqual(renumberIds(build));
    expect(encodeV2(decoded)).toEqual(bytes);
    expect(decoded.buffs.classSkillIds).toEqual([
      FIXTURE_IDS.heavensStep,
      FIXTURE_IDS.hymnDamageReduction,
    ]);
    expect(decoded.accessorySets[1]?.pieceSources).toEqual({
      ring1: null,
      ring2: FIXTURE_IDS.defendersSet,
      earring1: null,
      earring2: FIXTURE_IDS.speedoLine,
      necklace: FIXTURE_IDS.championsSet,
    });
    // CW jewel tiers travel in the v1 upgrade byte: Speedo +5, Pep +5, a single-tier Meteofy.
    expect(decoded.accessorySets[1]?.upgrades.earring2).toBe(5);
    expect(decoded.accessorySets[2]?.pieceSources).toMatchObject({
      ring1: FIXTURE_IDS.meteofyLine,
      necklace: FIXTURE_IDS.pepLine,
    });
    expect(decoded.accessorySets[2]?.upgrades).toMatchObject({ ring1: 0, necklace: 5 });
  });

  it('costs five bytes per accessory set and one per buffs block over v1 when nothing is mixed', () => {
    const build: BuildState = {
      ...createDefaultBuild(data),
      nextId: 4,
      accessorySets: [createAccessorySetEntry(3, FIXTURE_IDS.adeptsSet)],
      buffs: { ...createDefaultBuild(data).buffs, classSkillIds: [] },
    };

    expect(encodeV2(build).length).toBe(encodeV1(build).length + 5 + 1);
  });

  it('rejects a body that ends inside the appended fields', () => {
    const bytes = encodeV2(maximalBuild(data));

    expect(decodeErrorCode(() => decodeV2(encodeV1(maximalBuild(data))))).toBe('CORRUPT');
    expect(decodeErrorCode(() => decodeV2(bytes.slice(0, bytes.length - 1)))).toBe('TRUNCATED');
  });
});

describe('reading v1 codes', () => {
  it('decodes a v1 body with no overrides and no class skills', () => {
    const build = maximalBuild(data);

    expect(decodeV1(encodeV1(build))).toStrictEqual(withoutV2Fields(renumberIds(build)));
  });

  it('still accepts the v1 envelope through the public decoder', async () => {
    const build = maximalBuild(data);
    const result = await decodeShareCode(data, v1ShareCode(build));

    if (!result.ok) {
      throw new Error(`v1 code rejected: ${result.error.code}`);
    }

    const decoded = result.value.build;
    const first = requireDefined(decoded.accessorySets[0], 'accessory set');

    expect(decoded.buffs.classSkillIds).toEqual([]);
    expect(first.pieceSources).toEqual({
      ring1: null,
      ring2: null,
      earring1: null,
      earring2: null,
      necklace: null,
    });
    expect(decoded.weapons.length).toBe(build.weapons.length);
  });
});
