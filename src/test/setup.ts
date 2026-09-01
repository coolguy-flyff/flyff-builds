// Global Vitest setup. Component tests opt into jsdom with a `// @vitest-environment jsdom` docblock.

/** jsdom has no ResizeObserver, which Headless UI menus need to open; nothing is laid out, so observing is a no-op. */
class NoopResizeObserver implements ResizeObserver {
  observe(): void {
    // jsdom performs no layout, so there is never a resize to report.
  }

  unobserve(): void {
    // Nothing was observed.
  }

  disconnect(): void {
    // Nothing was observed.
  }
}

if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = NoopResizeObserver;
}

if (typeof window !== 'undefined' && 'CompressionStream' in globalThis) {
  // Under jsdom, Node's CompressionStream is visible but jsdom's Blob has no `.stream()`, so the
  // share codec's native path cannot run. Hiding the API makes `defaultDeflater()` fall back to
  // fflate, exactly like a browser without Compression Streams.
  Reflect.deleteProperty(globalThis, 'CompressionStream');
  Reflect.deleteProperty(globalThis, 'DecompressionStream');
}
