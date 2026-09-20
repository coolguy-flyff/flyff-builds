import { vi } from 'vitest';

/**
 * Deterministic `Math.random` for Flyffulator's damage code: the queued values feed its rolls in
 * call order (hit, crit, crit factor, …); once they run out every later roll gets `fallback`.
 * A constant stub is unsafe there — `triggerSkills` rolls `random × 100 <= 0` for the auto-stack
 * chances and would push a buff into the attacker — so the fallback stays high.
 */

/** Just below 1: the highest roll `floor(min + r × span)` can land on. */
export const HIGH_ROLL = 1 - 1e-9;

export interface RollQueue {
  /** How many rolls Flyffulator asked for. */
  readonly calls: () => number;
}

export function queueRolls(values: readonly number[], fallback = HIGH_ROLL): RollQueue {
  const pending = [...values];
  let calls = 0;

  vi.spyOn(Math, 'random').mockImplementation(() => {
    calls += 1;

    return pending.shift() ?? fallback;
  });

  return { calls: () => calls };
}
