import { LIMITS } from '@/domain/build';
import { DashedAddCard } from '@/components/DashedAddCard';
import { useActions, useAppStore, useBuild } from '@/state';

import { CollapsedSwapCard } from './CollapsedSwapCard';
import { ExpandedSwapCard } from './ExpandedSwapCard';

/**
 * Gear swaps (plan A3.2): one expanded editor, the rest collapsed to a summary row. A missing or
 * stale `expandedSwapId` falls back to the first swap.
 */
export function SwapsSection() {
  const build = useBuild();
  const expandedId = useAppStore((state) => state.ui.expandedSwapId);
  const actions = useActions();
  const activeId = build.gearSwaps.some((swap) => swap.id === expandedId)
    ? expandedId
    : (build.gearSwaps[0]?.id ?? null);
  const atLimit = build.gearSwaps.length >= LIMITS.gearSwaps;

  return (
    <div className="flex flex-col gap-3.5">
      {build.gearSwaps.map((swap) =>
        swap.id === activeId ? (
          <ExpandedSwapCard key={swap.id} swap={swap} />
        ) : (
          <CollapsedSwapCard
            key={swap.id}
            swap={swap}
            onExpand={() => {
              actions.setExpandedSwap(swap.id);
            }}
          />
        ),
      )}
      <DashedAddCard
        label="+ Add swap"
        hint={
          atLimit
            ? `Limit of ${LIMITS.gearSwaps} swaps reached`
            : 'pre-filled with the first entry of every list'
        }
        disabled={atLimit}
        onClick={() => {
          actions.setExpandedSwap(actions.addEntry('gearSwaps'));
        }}
      />
    </div>
  );
}
