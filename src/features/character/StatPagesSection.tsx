import { LIMITS } from '@/domain/build';
import { DashedAddCard } from '@/components/DashedAddCard';
import { useActions, useAppStore, useBuild } from '@/state';

import { StatPageCard } from './StatPageCard';

export function StatPagesSection() {
  const build = useBuild();
  const selectedId = useAppStore((state) => state.ui.selected.statPages);
  const actions = useActions();
  const activeId = selectedId ?? build.statPages[0]?.id ?? null;
  const atLimit = build.statPages.length >= LIMITS.statPages;

  return (
    <div className="flex flex-col gap-3.5">
      {build.statPages.map((page) => (
        <StatPageCard
          key={page.id}
          page={page}
          expanded={page.id === activeId}
          onSelect={() => {
            actions.selectEntry('statPages', page.id);
          }}
        />
      ))}
      <DashedAddCard
        label="+ Add stat page"
        hint={atLimit ? `Limit of ${LIMITS.statPages} pages reached` : undefined}
        disabled={atLimit}
        onClick={() => {
          actions.addEntry('statPages');
        }}
      />
    </div>
  );
}
