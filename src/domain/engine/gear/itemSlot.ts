import type { GameData, SlimItem } from '@/data';

import type { RandomStatLine, SkillAwake } from '../../build/schema';
import { defaultStatRangeValue, hasRandomStats, randomStatLineCount } from '../../rules';
import { contribution, origin, type Sink } from '../abilities/collect';
import type { ContributionOriginKind } from '../abilities/types';
import { ENGINE_ISSUE_CODES, engineWarning } from '../issues';

/**
 * Pieces shared by every worn item (weapons, shields, armor parts, cloaks): item lookup, ability
 * lines with stat ranges, ultimate random stats and skill awakes. Mirrors the per-item part of
 * `Entity.getStat` (flyffentity.js:1175-1221).
 */

export function itemLabel(item: SlimItem, upgrade: number): string {
  return `${item.name} +${upgrade}`;
}

/** Looks an entry's item up; an unknown id is reported and treated as an empty slot. */
export function resolveItemId(
  data: GameData,
  sink: Sink,
  itemId: number | null,
  what: string,
): SlimItem | null {
  let item: SlimItem | null = null;

  if (itemId !== null) {
    item = data.items.get(itemId) ?? null;

    if (item === null) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.unknownItem,
          `${what} #${itemId} is not in the game data; the slot counts as empty`,
        ),
      );
    }
  }

  return item;
}

/**
 * Item abilities; ranged abilities (`add…addMax`) take the entry's chosen value, in ranged-ability
 * order, defaulting to the midpoint (FLYFFULATOR_QUIRKS.statRangesPerRangedAbility).
 */
export function collectItemAbilities(
  sink: Sink,
  item: SlimItem,
  kind: ContributionOriginKind,
  statRanges: readonly number[],
): void {
  let rangedIndex = 0;

  for (const ability of item.abilities ?? []) {
    let value = ability.add;
    let detail: 'ability' | 'statRange' = 'ability';

    if (ability.addMax !== undefined) {
      value = statRanges[rangedIndex] ?? defaultStatRangeValue(ability);
      detail = 'statRange';
      rangedIndex += 1;
    }

    sink.contributions.push(
      contribution(
        ability.parameter,
        value,
        ability.rate,
        origin(kind, item.name, { detail, itemId: item.id }),
      ),
    );
  }
}

/** Ultimate random-stat lines: only the lines unlocked by the upgrade count, rate from the item. */
export function collectRandomStats(
  sink: Sink,
  item: SlimItem,
  upgrade: number,
  lines: readonly (RandomStatLine | null)[],
  kind: ContributionOriginKind,
): void {
  const holder = itemLabel(item, upgrade);

  if (lines.length > 0 && !hasRandomStats(item)) {
    sink.issues.push(
      engineWarning(
        ENGINE_ISSUE_CODES.randomStatInvalid,
        `${holder}: random stats ignored because the item cannot roll any`,
      ),
    );

    return;
  }

  const activeLines = Math.min(lines.length, randomStatLineCount(upgrade));
  const possible = item.possibleRandomStats ?? [];

  for (let index = 0; index < activeLines; index += 1) {
    const line = lines[index];

    if (line === null || line === undefined) {
      continue;
    }

    const ability = possible.find((candidate) => candidate.parameter === line.parameter);

    if (ability === undefined) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.randomStatInvalid,
          `${holder}: random stat line ${index + 1} (${line.parameter}) is not available on this item; ignored`,
        ),
      );

      continue;
    }

    sink.contributions.push(
      contribution(
        line.parameter,
        line.value,
        ability.rate,
        origin(kind, `${item.name} (random stat ${index + 1})`, {
          detail: 'randomStat',
          itemId: item.id,
        }),
      ),
    );
  }
}

/**
 * Skill awakes are rate-only and match their exact parameter
 * (FLYFFULATOR_QUIRKS.exactSkillAwakeMatch). Skill-damage awakes (`skill:<id>`) only affect one
 * skill's damage, which is not modeled — they contribute nothing to the results.
 */
export function collectSkillAwake(
  sink: Sink,
  item: SlimItem,
  awake: SkillAwake | null,
  kind: ContributionOriginKind,
): void {
  if (awake !== null && !awake.parameter.startsWith('skill:')) {
    sink.contributions.push(
      contribution(
        awake.parameter,
        awake.value,
        true,
        origin(kind, `${item.name} (skill awake)`, { detail: 'skillAwake', itemId: item.id }),
        'exact',
      ),
    );
  }
}
