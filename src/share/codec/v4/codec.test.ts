import { describe, expect, it } from 'vitest';

import { loadBundledGameData } from '@/data';
import { createDefaultBuild } from '@/domain/build/defaults';

import { decodeShareCode, encodeShareCode } from '../../index';
import { decodeErrorCode } from '../../testing/errors';
import { FIXTURE_IDS, maximalBuild, withoutV4Fields } from '../../testing/fixtures';
import { renumberIds } from '../../testing/ids';
import { decodeV3 } from '../v3/decode';
import { encodeV3 } from '../v3/encode';

import { decodeV4 } from './decode';
import { encodeV4 } from './encode';

const data = loadBundledGameData();

describe('encodeV4 / decodeV4', () => {
  it('round-trips the maximal build, couple skills included', () => {
    const build = maximalBuild(data);
    const bytes = encodeV4(build);
    const decoded = decodeV4(bytes);

    expect(decoded).toStrictEqual(renumberIds(build));
    expect(encodeV4(decoded)).toEqual(bytes);
    expect(decoded.buffs.coupleSkillIds).toEqual([
      FIXTURE_IDS.staminaBoost,
      FIXTURE_IDS.madrigalStroll,
    ]);
  });

  it('costs one count byte over v3 without couple skills', () => {
    const build = createDefaultBuild(data);

    expect(encodeV4(build).length).toBe(encodeV3(build).length + 1);
  });

  it('rejects a body that ends early or runs past the targets', () => {
    const bytes = encodeV4(maximalBuild(data));

    expect(decodeErrorCode(() => decodeV4(bytes.slice(0, bytes.length - 1)))).toBe('TRUNCATED');
    expect(decodeErrorCode(() => decodeV4(Uint8Array.from([...bytes, 0])))).toBe('CORRUPT');
  });

  it('decodes earlier bodies with no couple skills', () => {
    const build = withoutV4Fields(maximalBuild(data));

    expect(decodeV3(encodeV3(build))).toStrictEqual(renumberIds(build));
  });

  it('is what the public encoder produces', async () => {
    const build = maximalBuild(data);
    const result = await decodeShareCode(data, await encodeShareCode(data, build));

    if (!result.ok) {
      throw new Error(`v4 code rejected: ${result.error.code}`);
    }

    expect(result.value.build).toStrictEqual(renumberIds(build));
  });

  it('drops ids that are not couple skills', async () => {
    const build = maximalBuild(data);
    const tampered = {
      ...build,
      buffs: { ...build.buffs, coupleSkillIds: [FIXTURE_IDS.staminaBoost, 424242] },
    };
    const result = await decodeShareCode(data, await encodeShareCode(data, tampered));

    if (!result.ok) {
      throw new Error(`v4 code rejected: ${result.error.code}`);
    }

    expect(result.value.build.buffs.coupleSkillIds).toEqual([FIXTURE_IDS.staminaBoost]);
  });
});
