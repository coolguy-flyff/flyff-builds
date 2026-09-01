import { describe, expect, it } from 'vitest';

import {
  defaultDeflater,
  fflateDeflater,
  isNativeDeflateSupported,
  nativeDeflater,
  type Deflater,
} from './compression';

const deflaters: [string, Deflater][] = [
  ['native', nativeDeflater],
  ['fflate', fflateDeflater],
];
const sample = new TextEncoder().encode('flyff builds '.repeat(40));
const garbage = Uint8Array.from([0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff]);

describe.each(deflaters)('%s deflater', (_name, deflater) => {
  it('round-trips and shrinks repetitive data', async () => {
    const deflated = await deflater.deflateRaw(sample);

    expect(deflated.length).toBeLessThan(sample.length);
    expect(await deflater.inflateRaw(deflated)).toEqual(sample);
  });

  it('round-trips empty input', async () => {
    expect(await deflater.inflateRaw(await deflater.deflateRaw(new Uint8Array(0)))).toEqual(
      new Uint8Array(0),
    );
  });

  it('rejects data that is not a DEFLATE stream', async () => {
    await expect(deflater.inflateRaw(garbage)).rejects.toThrow();
  });
});

describe('cross-compatibility', () => {
  it('inflates with one implementation what the other deflated', async () => {
    const fromNative = await nativeDeflater.deflateRaw(sample);
    const fromFflate = await fflateDeflater.deflateRaw(sample);

    expect(await fflateDeflater.inflateRaw(fromNative)).toEqual(sample);
    expect(await nativeDeflater.inflateRaw(fromFflate)).toEqual(sample);
  });
});

describe('defaultDeflater', () => {
  it('prefers the native implementation where it exists (Node 22 does)', () => {
    expect(isNativeDeflateSupported()).toBe(true);
    expect(defaultDeflater()).toBe(nativeDeflater);
  });
});
