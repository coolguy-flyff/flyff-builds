import { getItem, type GameData } from '@/data';

import {
  blessingSlotCapacity,
  blessingSlotsUsed,
  offhandKind,
  remainingStatPoints,
  stackCount,
  ultimateJewelSlots,
} from '../rules';

import type { BuildState, EntryListKey } from './schema';

/**
 * User-facing validation issues (plan A5.2). Computed from the build alone (no results needed) so
 * list rows, category tabs and swap cards can show badges cheaply. Engine degradations that only
 * show up while computing results are reported by the engine itself.
 */

export type IssueSeverity = 'error' | 'warning';

export interface IssueTarget {
  readonly list: EntryListKey | 'character';
  readonly id: number;
}

export interface Issue {
  readonly severity: IssueSeverity;
  readonly code: string;
  readonly message: string;
  readonly target: IssueTarget;
}

export function collectIssues(data: GameData, build: BuildState): Issue[] {
  const issues: Issue[] = [];
  const level = build.character.level;

  for (const page of build.statPages) {
    const remaining = remainingStatPoints(level, page);

    if (remaining < 0) {
      issues.push({
        severity: 'error',
        code: 'stat-page-over-allocated',
        message: `Over-allocated by ${-remaining}`,
        target: { list: 'statPages', id: page.id },
      });
    } else if (remaining > 0) {
      issues.push({
        severity: 'warning',
        code: 'stat-page-unspent',
        message: `${remaining} unspent`,
        target: { list: 'statPages', id: page.id },
      });
    }
  }

  for (const weapon of build.weapons) {
    const item = weapon.itemId === null ? undefined : getItem(data, weapon.itemId);

    if (item === undefined) {
      continue;
    }

    const jewelSlots = ultimateJewelSlots(item, weapon.upgrade);
    const jewelCount = stackCount(weapon.jewels);

    if (jewelCount > jewelSlots) {
      issues.push({
        severity: 'warning',
        code: 'jewels-exceed-slots',
        message: `${jewelCount}/${jewelSlots} jewels — ${jewelCount - jewelSlots} inactive`,
        target: { list: 'weapons', id: weapon.id },
      });
    }
  }

  for (const fashion of build.fashionSets) {
    const used = blessingSlotsUsed(data, fashion.blessings);
    const capacity = blessingSlotCapacity(fashion.cloakItemId !== null);

    if (used > capacity) {
      issues.push({
        severity: 'warning',
        code: 'blessing-slots-exceeded',
        message: `Needs ${used} blessing slots; fashion has ${capacity}`,
        target: { list: 'fashionSets', id: fashion.id },
      });
    }
  }

  const pagesWithErrors = new Set(
    issues
      .filter((issue) => issue.target.list === 'statPages' && issue.severity === 'error')
      .map((issue) => issue.target.id),
  );

  for (const swap of build.gearSwaps) {
    if (pagesWithErrors.has(swap.statPageId)) {
      issues.push({
        severity: 'error',
        code: 'swap-stat-page-invalid',
        message: 'Stat page is over-allocated',
        target: { list: 'gearSwaps', id: swap.id },
      });
    }

    if (swap.offhand !== null) {
      const weaponEntry = build.weapons.find((entry) => entry.id === swap.weaponId);
      const mainhand =
        weaponEntry?.itemId === undefined || weaponEntry.itemId === null
          ? null
          : (getItem(data, weaponEntry.itemId) ?? null);
      const expected = offhandKind(data, build.character.jobId, mainhand);

      if (expected !== swap.offhand.kind) {
        const reason =
          expected === 'none' ? 'two-handed weapon equipped' : `offhand must be a ${expected}`;
        issues.push({
          severity: 'error',
          code: 'offhand-ignored',
          message: `Offhand ignored: ${reason}`,
          target: { list: 'gearSwaps', id: swap.id },
        });
      }
    }
  }

  return issues;
}

export function issuesFor(
  issues: readonly Issue[],
  list: EntryListKey | 'character',
  id: number,
): Issue[] {
  return issues.filter((issue) => issue.target.list === list && issue.target.id === id);
}

export function worstSeverity(issues: readonly Issue[]): IssueSeverity | null {
  let worst: IssueSeverity | null = null;

  for (const issue of issues) {
    if (issue.severity === 'error') {
      worst = 'error';
      break;
    }

    worst = 'warning';
  }

  return worst;
}
