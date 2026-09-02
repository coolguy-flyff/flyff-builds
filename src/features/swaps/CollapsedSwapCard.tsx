import type { KeyboardEvent } from 'react';

import { issuesFor, type GearSwap } from '@/domain/build';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { cx } from '@/lib/cx';
import { useActions, useBuild, useGameData, useSelectors } from '@/state';

import { IssueChips, SwapChips } from './SwapChips';
import { compositionChips } from './swapModel';

/**
 * A swap folded to one row (plan D5): name, issue chips, move buttons and the composition; click
 * to expand. The order is the results order too.
 */
export function CollapsedSwapCard({ swap, onExpand }: { swap: GearSwap; onExpand: () => void }) {
  const data = useGameData();
  const build = useBuild();
  const selectors = useSelectors();
  const actions = useActions();
  const name = selectors.entryName(build, 'gearSwaps', swap.id);
  const issues = issuesFor(selectors.issues(build), 'gearSwaps', swap.id);
  const chips = compositionChips(data, build, swap, (list, id) =>
    selectors.entryName(build, list, id),
  );
  const index = build.gearSwaps.findIndex((candidate) => candidate.id === swap.id);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onExpand();
    }
  };

  return (
    <Card
      role="button"
      tabIndex={0}
      aria-label={`Expand ${name}`}
      onClick={onExpand}
      onKeyDown={onKeyDown}
      className={cx(
        'animate-card-in flex cursor-pointer flex-col gap-2.5 transition-colors hover:bg-sub',
        !swap.includeInResults && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[13.5px] font-semibold">{name}</span>
        {!swap.includeInResults && <Chip>excluded from results</Chip>}
        <IssueChips issues={issues} />
        <span
          className="ml-auto flex items-center gap-1.5"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Button
            size="sm"
            aria-label={`Move ${name} up`}
            disabled={index <= 0}
            onClick={() => {
              actions.moveEntry('gearSwaps', swap.id, -1);
            }}
          >
            ↑
          </Button>
          <Button
            size="sm"
            aria-label={`Move ${name} down`}
            disabled={index === build.gearSwaps.length - 1}
            onClick={() => {
              actions.moveEntry('gearSwaps', swap.id, 1);
            }}
          >
            ↓
          </Button>
          <span className="text-[10.5px] text-dim">click to expand</span>
        </span>
      </div>
      <SwapChips chips={chips} />
    </Card>
  );
}
