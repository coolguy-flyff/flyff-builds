import type { Ability, SlimItem } from '@/data';
import { LIMITS, type RandomStatLine } from '@/domain/build';
import { defaultRandomStatValue } from '@/domain/rules';

export type RandomStatLines = readonly (RandomStatLine | null)[];

/** Always four lines for the editor grid, `null` for empty ones. */
export function paddedRandomStatLines(lines: RandomStatLines): (RandomStatLine | null)[] {
  const padded: (RandomStatLine | null)[] = [];

  for (let index = 0; index < LIMITS.randomStatLines; index += 1) {
    padded.push(lines[index] ?? null);
  }

  return padded;
}

/** Storage form: trailing empty lines dropped. */
export function trimmedRandomStatLines(lines: RandomStatLines): (RandomStatLine | null)[] {
  const trimmed = [...lines];

  while (trimmed.length > 0 && trimmed[trimmed.length - 1] === null) {
    trimmed.pop();
  }

  return trimmed;
}

export function possibleRandomStat(item: SlimItem, parameter: string): Ability | undefined {
  return item.possibleRandomStats?.find((ability) => ability.parameter === parameter);
}

/**
 * Changes a line's stat and resets its value to that stat's (halved) midpoint. Lines locked by the
 * current upgrade never block a stat: an inactive line holding the chosen stat is cleared instead,
 * so nobody has to upgrade to +10 just to free a stat (plan fix 2026-09-01, point 13).
 */
export function withRandomStatParameter(
  item: SlimItem,
  lines: RandomStatLines,
  index: number,
  parameter: string | null,
  activeCount: number,
): (RandomStatLine | null)[] {
  const next = paddedRandomStatLines(lines);
  const ability = parameter === null ? undefined : possibleRandomStat(item, parameter);

  next[index] =
    ability === undefined
      ? null
      : { parameter: ability.parameter, value: defaultRandomStatValue(ability, index) };

  if (parameter !== null) {
    for (let other = 0; other < next.length; other += 1) {
      if (other !== index && other >= activeCount && next[other]?.parameter === parameter) {
        next[other] = null;
      }
    }
  }

  return trimmedRandomStatLines(next);
}

export function withRandomStatValue(
  lines: RandomStatLines,
  index: number,
  value: number,
): (RandomStatLine | null)[] {
  const next = paddedRandomStatLines(lines);
  const line = next[index];

  if (line !== null && line !== undefined) {
    next[index] = { parameter: line.parameter, value };
  }

  return trimmedRandomStatLines(next);
}

/** Parameters taken by the other ACTIVE lines (locked lines never block a stat). */
export function usedRandomStatParameters(
  lines: RandomStatLines,
  exceptIndex: number,
  activeCount: number,
): Set<string> {
  const used = new Set<string>();

  lines.forEach((line, index) => {
    if (line !== null && index !== exceptIndex && index < activeCount) {
      used.add(line.parameter);
    }
  });

  return used;
}
