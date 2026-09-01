import type { GameData } from '@/data';
import { memoByRef } from '@/lib/memo';

/**
 * Caches a per-entry resolution on the identity of the (immutable) entry object, scoped by the
 * game-data instance (plan B7.6). Unchanged entries are never re-resolved between keystrokes.
 */
export function memoizeByDataAndEntry<E extends object, R>(
  compute: (data: GameData, entry: E) => R,
): (data: GameData, entry: E) => R {
  const perData = memoByRef((data: GameData) => memoByRef((entry: E) => compute(data, entry)));

  return (data, entry) => perData(data)(entry);
}
