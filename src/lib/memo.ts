/**
 * Memoises a pure function on the identity of its (object) argument. Because app state and game
 * data are immutable, a new reference means new input; unchanged references hit the cache.
 */
export function memoByRef<K extends object, V>(compute: (key: K) => V): (key: K) => V {
  const cache = new WeakMap<K, V>();

  return (key: K): V => {
    let value = cache.get(key);

    if (value === undefined) {
      value = compute(key);
      cache.set(key, value);
    }

    return value;
  };
}

/** Two-level memo: by object identity, then by a string/number key. */
export function memoByRefAndKey<K extends object, S extends string | number, V>(
  compute: (key: K, sub: S) => V,
): (key: K, sub: S) => V {
  const cache = new WeakMap<K, Map<S, V>>();

  return (key: K, sub: S): V => {
    let inner = cache.get(key);

    if (inner === undefined) {
      inner = new Map<S, V>();
      cache.set(key, inner);
    }

    let value = inner.get(sub);

    if (value === undefined) {
      value = compute(key, sub);
      inner.set(sub, value);
    }

    return value;
  };
}
