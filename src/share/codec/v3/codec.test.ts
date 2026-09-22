import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build/defaults';
import type { BuildState } from '@/domain/build/schema';
import { requireDefined } from '@/lib/assert';

import { encodeBase64Url } from '../../base64url';
import { ShareEncodeError } from '../../errors';
import { decodeShareCode } from '../../index';
import { decodeErrorCode } from '../../testing/errors';
import { maximalBuild, withoutV3Fields, withoutV4Fields } from '../../testing/fixtures';
import { renumberIds } from '../../testing/ids';
import { decodeV2 } from '../v2/decode';
import { encodeV2 } from '../v2/encode';

import { decodeV3 } from './decode';
import { encodeV3 } from './encode';

const data = loadBundledGameData();
const V2_ENVELOPE = [2, 0];
const V3_ENVELOPE = [3, 0];
/** name (1 + 2 bytes), two varint defenses, four scaled percentages: the smallest target. */
const MIN_TARGET_BYTES = 3 + 2 + 4;

/** The maximal build as codec v3 can express it (no couple skills). */
function v3MaximalBuild(): BuildState {
  return withoutV4Fields(maximalBuild(data));
}

/** A share code in an undeflated envelope around a body, as links shared before v4 look. */
function shareCode(envelope: readonly number[], body: Uint8Array): string {
  const code = new Uint8Array(envelope.length + body.length);

  code.set(envelope);
  code.set(body, envelope.length);

  return encodeBase64Url(code);
}

describe('encodeV3 / decodeV3', () => {
  it('round-trips the maximal build, custom PvP targets included', () => {
    const build = v3MaximalBuild();
    const bytes = encodeV3(build);
    const decoded = decodeV3(bytes);

    expect(decoded).toStrictEqual(renumberIds(build));
    expect(encodeV3(decoded)).toEqual(bytes);
    expect(decoded.pvpTargets.map((target) => target.name)).toEqual([
      'Guild tank ✨',
      'Glass cannon',
    ]);
    expect(decoded.pvpTargets[0]).toMatchObject({ magicResistance: 42.5, incomingDamage: -12 });
    // Targets get their ids after the swaps.
    expect(decoded.pvpTargets.map((target) => target.id)).toEqual([23, 24]);
  });

  it('costs one count byte over v2 without targets and a few bytes per target', () => {
    const build = createDefaultBuild(data);

    expect(encodeV3(build).length).toBe(encodeV2(build).length + 1);
    expect(encodeV3(v3MaximalBuild()).length).toBeGreaterThanOrEqual(
      encodeV2(withoutV3Fields(maximalBuild(data))).length + 1 + 2 * MIN_TARGET_BYTES,
    );
  });

  it('rejects a body that ends inside the targets or runs past them', () => {
    const bytes = encodeV3(v3MaximalBuild());

    expect(decodeErrorCode(() => decodeV3(bytes.slice(0, bytes.length - 1)))).toBe('TRUNCATED');
    expect(decodeErrorCode(() => decodeV3(Uint8Array.from([...bytes, 0])))).toBe('CORRUPT');
    expect(decodeErrorCode(() => decodeV3(encodeV2(withoutV3Fields(maximalBuild(data)))))).toBe(
      'TRUNCATED',
    );
  });

  it('refuses to encode custom targets with an earlier codec', () => {
    expect(() => encodeV2(maximalBuild(data))).toThrow(ShareEncodeError);
  });

  it('still accepts the v3 envelope through the public decoder', async () => {
    const build = v3MaximalBuild();
    const result = await decodeShareCode(data, shareCode(V3_ENVELOPE, encodeV3(build)));

    if (!result.ok) {
      throw new Error(`v3 code rejected: ${result.error.code}`);
    }

    expect(result.value.build.pvpTargets).toStrictEqual(renumberIds(build).pvpTargets);
    expect(result.value.build.buffs.coupleSkillIds).toEqual([]);
  });
});

describe('reading v2 codes', () => {
  it('decodes a v2 body with no custom targets', () => {
    const build = withoutV3Fields(maximalBuild(data));

    expect(decodeV2(encodeV2(build))).toStrictEqual(renumberIds(build));
    expect(decodeV2(encodeV2(build)).pvpTargets).toEqual([]);
  });

  it('still accepts the v2 envelope through the public decoder', async () => {
    const build = withoutV3Fields(maximalBuild(data));
    const result = await decodeShareCode(data, shareCode(V2_ENVELOPE, encodeV2(build)));

    if (!result.ok) {
      throw new Error(`v2 code rejected: ${result.error.code}`);
    }

    const decoded = result.value.build;

    expect(decoded.pvpTargets).toEqual([]);
    expect(requireDefined(decoded.accessorySets[1], 'accessory set').pieceSources.ring2).toBe(
      requireDefined(build.accessorySets[1], 'accessory set').pieceSources.ring2,
    );
  });
});
