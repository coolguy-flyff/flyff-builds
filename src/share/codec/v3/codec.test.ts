import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build/defaults';
import type { BuildState } from '@/domain/build/schema';
import { requireDefined } from '@/lib/assert';

import { encodeBase64Url } from '../../base64url';
import { ShareEncodeError } from '../../errors';
import { decodeShareCode, encodeShareCode } from '../../index';
import { decodeErrorCode } from '../../testing/errors';
import { maximalBuild, withoutV3Fields } from '../../testing/fixtures';
import { renumberIds } from '../../testing/ids';
import { decodeV2 } from '../v2/decode';
import { encodeV2 } from '../v2/encode';

import { decodeV3 } from './decode';
import { encodeV3 } from './encode';

const data = loadBundledGameData();
const V2_ENVELOPE = [2, 0];
/** name (1 + 2 bytes), two varint defenses, four scaled percentages: the smallest target. */
const MIN_TARGET_BYTES = 3 + 2 + 4;

/** A share code in the v2 envelope around a v2 body, as links shared before v3 look. */
function v2ShareCode(build: BuildState): string {
  const body = encodeV2(build);
  const code = new Uint8Array(V2_ENVELOPE.length + body.length);

  code.set(V2_ENVELOPE);
  code.set(body, V2_ENVELOPE.length);

  return encodeBase64Url(code);
}

describe('encodeV3 / decodeV3', () => {
  it('round-trips the maximal build, custom PvP targets included', () => {
    const build = maximalBuild(data);
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
    expect(encodeV3(maximalBuild(data)).length).toBeGreaterThanOrEqual(
      encodeV2(withoutV3Fields(maximalBuild(data))).length + 1 + 2 * MIN_TARGET_BYTES,
    );
  });

  it('rejects a body that ends inside the targets or runs past them', () => {
    const bytes = encodeV3(maximalBuild(data));

    expect(decodeErrorCode(() => decodeV3(bytes.slice(0, bytes.length - 1)))).toBe('TRUNCATED');
    expect(decodeErrorCode(() => decodeV3(Uint8Array.from([...bytes, 0])))).toBe('CORRUPT');
    expect(decodeErrorCode(() => decodeV3(encodeV2(withoutV3Fields(maximalBuild(data)))))).toBe(
      'TRUNCATED',
    );
  });

  it('refuses to encode custom targets with an earlier codec', () => {
    expect(() => encodeV2(maximalBuild(data))).toThrow(ShareEncodeError);
  });

  it('is what the public encoder produces', async () => {
    const build = maximalBuild(data);
    const result = await decodeShareCode(data, await encodeShareCode(data, build));

    if (!result.ok) {
      throw new Error(`v3 code rejected: ${result.error.code}`);
    }

    expect(result.value.build.pvpTargets).toStrictEqual(renumberIds(build).pvpTargets);
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
    const result = await decodeShareCode(data, v2ShareCode(build));

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
