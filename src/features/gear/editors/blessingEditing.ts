import type { GameData } from '@/data';
import { LIMITS, type BlessingLine } from '@/domain/build';
import { reachableBlessingTotals } from '@/domain/rules';

import { nearestValue } from '../values';

export function blessingParameters(data: GameData): string[] {
  return Object.keys(data.blessings);
}

/** The largest total the eight blessing slots can reach for a stat. */
export function maxBlessingTotal(data: GameData, parameter: string): number {
  const totals = reachableBlessingTotals(data, parameter);

  return totals[totals.length - 1] ?? 0;
}

function snapTotal(data: GameData, parameter: string, total: number): number {
  return nearestValue(reachableBlessingTotals(data, parameter), total) ?? 0;
}

/** First stat not already on a line, in table order. */
export function nextBlessingParameter(
  data: GameData,
  lines: readonly BlessingLine[],
): string | undefined {
  const used = new Set(lines.map((line) => line.parameter));

  return blessingParameters(data).find((parameter) => !used.has(parameter));
}

export function canAddBlessingLine(data: GameData, lines: readonly BlessingLine[]): boolean {
  return lines.length < LIMITS.blessingLines && nextBlessingParameter(data, lines) !== undefined;
}

/** Appends a line for the next free stat at its maximum total; unchanged when nothing can be added. */
export function addBlessingLine(data: GameData, lines: readonly BlessingLine[]): BlessingLine[] {
  const parameter = nextBlessingParameter(data, lines);
  let next = [...lines];

  if (parameter !== undefined && lines.length < LIMITS.blessingLines) {
    next = [...lines, { parameter, total: maxBlessingTotal(data, parameter) }];
  }

  return next;
}

/**
 * Changes a line's stat. When another line already carries that stat the two merge (the totals
 * add up and snap to a reachable total); otherwise the current total snaps to the new stat's grid.
 */
export function withBlessingParameter(
  data: GameData,
  lines: readonly BlessingLine[],
  index: number,
  parameter: string,
): BlessingLine[] {
  const current = lines[index];
  const duplicate = lines.findIndex(
    (line, position) => position !== index && line.parameter === parameter,
  );
  let next: BlessingLine[];

  if (current === undefined) {
    next = [...lines];
  } else if (duplicate === -1) {
    next = lines.map((line, position) =>
      position === index ? { parameter, total: snapTotal(data, parameter, line.total) } : line,
    );
  } else {
    next = lines
      .map((line, position) =>
        position === duplicate
          ? { parameter, total: snapTotal(data, parameter, line.total + current.total) }
          : line,
      )
      .filter((_line, position) => position !== index);
  }

  return next;
}

export function withBlessingTotal(
  lines: readonly BlessingLine[],
  index: number,
  total: number,
): BlessingLine[] {
  return lines.map((line, position) =>
    position === index ? { parameter: line.parameter, total } : line,
  );
}

export function removeBlessingLine(lines: readonly BlessingLine[], index: number): BlessingLine[] {
  return lines.filter((_line, position) => position !== index);
}
