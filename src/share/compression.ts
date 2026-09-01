/**
 * Raw DEFLATE (no zlib/gzip framing) behind a tiny async interface. The native Compression Streams
 * API is preferred; `fflate` is loaded lazily as the fallback for runtimes without `deflate-raw`.
 * Both produce standard DEFLATE streams, so a code compressed by one inflates with the other.
 */

export interface Deflater {
  deflateRaw(bytes: Uint8Array): Promise<Uint8Array>;
  inflateRaw(bytes: Uint8Array): Promise<Uint8Array>;
}

const FORMAT: CompressionFormat = 'deflate-raw';
/** fflate compression level: highest ratio; codes are tiny so speed is irrelevant. */
const FFLATE_LEVEL = 9;

async function transformBytes(
  bytes: Uint8Array,
  transform: GenericTransformStream,
): Promise<Uint8Array<ArrayBuffer>> {
  // `slice` also detaches the view from any shared buffer, which `Blob` refuses to wrap.
  const source = new Blob([bytes.slice()]).stream();
  const buffer = await new Response(source.pipeThrough(transform)).arrayBuffer();

  return new Uint8Array(buffer);
}

export const nativeDeflater: Deflater = {
  deflateRaw: (bytes) => transformBytes(bytes, new CompressionStream(FORMAT)),
  inflateRaw: (bytes) => transformBytes(bytes, new DecompressionStream(FORMAT)),
};

export const fflateDeflater: Deflater = {
  async deflateRaw(bytes) {
    const { deflateSync } = await import('fflate');

    return deflateSync(bytes, { level: FFLATE_LEVEL });
  },
  async inflateRaw(bytes) {
    const { inflateSync } = await import('fflate');

    return inflateSync(bytes);
  },
};

let nativeSupported: boolean | undefined;

/** Whether this runtime offers Compression Streams with the `deflate-raw` format. */
export function isNativeDeflateSupported(): boolean {
  if (nativeSupported === undefined) {
    try {
      new CompressionStream(FORMAT);
      new DecompressionStream(FORMAT);
      nativeSupported = true;
    } catch {
      // Expected on runtimes without the Compression Streams API or without `deflate-raw`
      // (older Safari): the fflate implementation takes over.
      nativeSupported = false;
    }
  }

  return nativeSupported;
}

export function defaultDeflater(): Deflater {
  return isNativeDeflateSupported() ? nativeDeflater : fflateDeflater;
}
