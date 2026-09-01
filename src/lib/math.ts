export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Rounds away floating-point noise (e.g. 0.1 + 0.2) to `decimals` places. */
export function roundTo(value: number, decimals: number): number {
  const factor = 10 ** decimals;

  return Math.round(value * factor) / factor;
}

/** Whether `value` sits on the grid `min + k·step` (within floating-point tolerance). */
export function isOnStep(value: number, min: number, step: number, epsilon = 1e-9): boolean {
  const steps = (value - min) / step;

  return Math.abs(steps - Math.round(steps)) < epsilon;
}

export function sum(values: readonly number[]): number {
  let total = 0;

  for (const value of values) {
    total += value;
  }

  return total;
}
