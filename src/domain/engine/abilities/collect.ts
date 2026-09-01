import type { Ability, GameData, SlimItem } from '@/data';

import type { SetStatAwake, Stack, StatAwake } from '../../build/schema';
import { ENGINE_ISSUE_CODES, engineWarning, type EngineIssue } from '../issues';
import type {
  Contribution,
  ContributionDetail,
  ContributionMatch,
  ContributionOrigin,
  ContributionOriginKind,
} from './types';

/**
 * Building blocks shared by every contribution source: origin construction, ability expansion,
 * stack (card/jewel) expansion with slot limits, and the sink collectors write into.
 */

export interface Collected {
  readonly contributions: readonly Contribution[];
  readonly issues: readonly EngineIssue[];
}

export interface Sink {
  readonly contributions: Contribution[];
  readonly issues: EngineIssue[];
}

export function createSink(): Sink {
  return { contributions: [], issues: [] };
}

export interface OriginExtras {
  readonly detail?: ContributionDetail;
  readonly itemId?: number;
  readonly skillId?: number;
}

/** Builds an origin without `undefined` keys (the schema is exact-optional). */
export function origin(
  kind: ContributionOriginKind,
  label: string,
  extras: OriginExtras = {},
): ContributionOrigin {
  const result: { -readonly [K in keyof ContributionOrigin]: ContributionOrigin[K] } = {
    kind,
    label,
  };

  if (extras.detail !== undefined) {
    result.detail = extras.detail;
  }

  if (extras.itemId !== undefined) {
    result.itemId = extras.itemId;
  }

  if (extras.skillId !== undefined) {
    result.skillId = extras.skillId;
  }

  return result;
}

export function contribution(
  parameter: string,
  add: number,
  rate: boolean,
  source: ContributionOrigin,
  match: ContributionMatch = 'union',
): Contribution {
  return { parameter, add, rate, match, origin: source };
}

/** One contribution per ability; `multiplier` folds stacked copies (cards ×N) into one line. */
export function abilityContributions(
  abilities: readonly Ability[],
  source: ContributionOrigin,
  multiplier = 1,
): Contribution[] {
  return abilities.map((ability) =>
    contribution(ability.parameter, ability.add * multiplier, ability.rate, source),
  );
}

/** Stat-awake lines are flat bonuses on the item (flyffentity.js:1269-1279). */
export function statAwakeContributions(
  awake: StatAwake,
  kind: ContributionOriginKind,
  item: SlimItem,
): Contribution[] {
  const source = origin(kind, `${item.name} (stat awake)`, {
    detail: 'statAwake',
    itemId: item.id,
  });
  const contributions: Contribution[] = [];

  for (const line of awake) {
    if (line !== null) {
      contributions.push(contribution(line.stat, line.value, false, source));
    }
  }

  return contributions;
}

/**
 * An equipment set's awake stores the overall totals across its four pieces, so it contributes
 * once — the sum equals Flyffulator's per-piece flat lines (flyffentity.js:1269-1279).
 */
export function setStatAwakeContributions(awake: SetStatAwake, setName: string): Contribution[] {
  const source = origin('setAwake', `${setName} (stat awake, 4 pieces)`, { detail: 'statAwake' });
  const contributions: Contribution[] = [];

  for (const line of awake) {
    if (line !== null) {
      contributions.push(contribution(line.stat, line.value, false, source));
    }
  }

  return contributions;
}

export interface LimitedStacks {
  readonly stacks: readonly Stack[];
  readonly ignored: number;
}

/** Keeps the first `limit` units in stack order; the rest are reported, not counted. */
export function limitStackUnits(stacks: readonly Stack[], limit: number): LimitedStacks {
  const taken: Stack[] = [];
  let remaining = Math.max(limit, 0);
  let ignored = 0;

  for (const stack of stacks) {
    const count = Math.min(stack.count, remaining);

    if (count > 0) {
      taken.push(count === stack.count ? stack : { itemId: stack.itemId, count });
    }

    remaining -= count;
    ignored += stack.count - count;
  }

  return { stacks: taken, ignored };
}

export interface StackSource {
  readonly kind: ContributionOriginKind;
  readonly detail: 'piercing' | 'jewel';
  /** Describes the holder in issue messages, e.g. `Oracle +10`. */
  readonly holder: string;
}

const STACK_NOUNS: Readonly<Record<StackSource['detail'], string>> = {
  piercing: 'card',
  jewel: 'jewel',
};

/** Cards and jewels: each stack expands to its item's abilities times the count, capped by slots. */
export function collectStacks(
  data: GameData,
  sink: Sink,
  stacks: readonly Stack[],
  slots: number,
  source: StackSource,
): void {
  const limited = limitStackUnits(stacks, slots);
  const noun = STACK_NOUNS[source.detail];

  if (limited.ignored > 0) {
    sink.issues.push(
      engineWarning(
        source.detail === 'jewel'
          ? ENGINE_ISSUE_CODES.jewelsExceedSlots
          : ENGINE_ISSUE_CODES.cardsExceedSlots,
        `${source.holder}: ${limited.ignored} ${noun}${limited.ignored === 1 ? '' : 's'} beyond the ${slots} available slots ignored`,
      ),
    );
  }

  for (const stack of limited.stacks) {
    const item = data.items.get(stack.itemId);

    if (item === undefined) {
      sink.issues.push(
        engineWarning(
          ENGINE_ISSUE_CODES.unknownItem,
          `${source.holder}: unknown ${noun} #${stack.itemId} ignored`,
        ),
      );

      continue;
    }

    sink.contributions.push(
      ...abilityContributions(
        item.abilities ?? [],
        origin(source.kind, `${item.name} ×${stack.count}`, {
          detail: source.detail,
          itemId: item.id,
        }),
        stack.count,
      ),
    );
  }
}
