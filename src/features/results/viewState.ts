/** Small pure helpers over the results view state (`ui.results`). */

/** The list with `value` added (at the end) or removed, never duplicated. */
export function setMembership<T>(list: readonly T[], value: T, present: boolean): T[] {
  const without = list.filter((item) => item !== value);

  return present ? [...without, value] : without;
}

export function toggleMembership<T>(list: readonly T[], value: T): T[] {
  return setMembership(list, value, !list.includes(value));
}

/** A stored baseline only applies while its column is visible; otherwise diff mode is off. */
export function effectiveBaseline(
  baselineSwapId: number | null,
  visibleSwapIds: readonly number[],
): number | null {
  let baseline: number | null = null;

  if (baselineSwapId !== null && visibleSwapIds.includes(baselineSwapId)) {
    baseline = baselineSwapId;
  }

  return baseline;
}
