import type { KeyboardEvent } from 'react';

import { issuesFor, type GearSwap } from '@/domain/build';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { DragHandle } from '@/components/Sortable';
import { useSortableItem } from '@/components/useSortableItem';
import { cx } from '@/lib/cx';
import { useBuild, useGameData, useSelectors } from '@/state';

import { IssueChips, SwapChips } from './SwapChips';
import { compositionChips } from './swapModel';

/**
 * A swap folded to one row (plan D5): drag grip, name, issue chips and the composition; click to
 * expand. The order is the results order too.
 */
export function CollapsedSwapCard({ swap, onExpand }: { swap: GearSwap; onExpand: () => void }) {
  const data = useGameData();
  const build = useBuild();
  const selectors = useSelectors();
  const name = selectors.entryName(build, 'gearSwaps', swap.id);
  const issues = issuesFor(selectors.issues(build), 'gearSwaps', swap.id);
  const chips = compositionChips(data, build, swap, (list, id) =>
    selectors.entryName(build, list, id),
  );
  const { attachNode, shiftStyle, isDragging, handle } = useSortableItem(swap.id, name);

  /** Only keys pressed on the card itself expand it; the grip's keys drive the drag sensor. */
  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      onExpand();
    }
  };

  return (
    <Card
      ref={attachNode}
      style={shiftStyle}
      role="button"
      tabIndex={0}
      aria-label={`Expand ${name}`}
      onClick={onExpand}
      onKeyDown={onKeyDown}
      className={cx(
        'animate-card-in flex cursor-pointer flex-col gap-2.5 transition-colors hover:bg-sub',
        !swap.includeInResults && 'opacity-60',
        isDragging && 'relative z-10 shadow-lg',
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="inline-flex"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <DragHandle handle={handle} />
        </span>
        <span className="text-[13.5px] font-semibold">{name}</span>
        {!swap.includeInResults && <Chip>excluded from results</Chip>}
        <IssueChips issues={issues} />
        <span className="ml-auto text-[10.5px] text-dim">click to expand</span>
      </div>
      <SwapChips chips={chips} />
    </Card>
  );
}
