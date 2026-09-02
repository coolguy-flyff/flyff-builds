import {
  issuesFor,
  LIMITS,
  swapsReferencing,
  worstSeverity,
  type GearListKey,
} from '@/domain/build';
import { EntityList, type EntityListItem } from '@/components/EntityList';
import { ItemIcon } from '@/components/ItemIcon';
import { useActions, useBuild, useGameData, useSelectors } from '@/state';

import { plural } from './format';
import { addLabelFor, GEAR_CATEGORIES } from './gearCategories';
import { describeGearEntries, issueChips } from './listRows';

const ICON_SIZE = 30;

function IconPlaceholder() {
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 rounded-[4px] bg-control"
      style={{ width: ICON_SIZE, height: ICON_SIZE }}
    />
  );
}

/** Master list of one gear category (plan A2 / D3), fed from the build and its issues. */
export function GearEntityList({
  category,
  selectedId,
  onSelect,
  onActivate,
  onAdd,
}: {
  category: GearListKey;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onActivate: (id: number) => void;
  onAdd: () => void;
}) {
  const data = useGameData();
  const build = useBuild();
  const selectors = useSelectors();
  const actions = useActions();
  const spec = GEAR_CATEGORIES[category];
  const issues = selectors.issues(build);
  const rows = describeGearEntries(data, build, category);
  const atLimit = rows.length >= LIMITS.entriesPerList;

  const items: EntityListItem[] = rows.map((row) => {
    const entryIssues = issuesFor(issues, category, row.id);
    const swaps = swapsReferencing(build, category, row.id);
    const swapNames = swaps.map((swap) => selectors.entryName(build, 'gearSwaps', swap.id));
    const problems = [
      ...(row.missing === null ? [] : [row.missing]),
      ...entryIssues.map((issue) => issue.message),
    ];

    return {
      id: row.id,
      name: selectors.entryName(build, category, row.id),
      nameClassName: row.nameClassName,
      icon: row.icon === null ? <IconPlaceholder /> : <ItemIcon icon={row.icon} size={ICON_SIZE} />,
      usage: `in ${plural(swaps.length, 'swap')}`,
      usageTitle: swapNames.length === 0 ? undefined : swapNames.join(', '),
      // An entry with nothing picked yet is a warning, not "no issues".
      status: worstSeverity(entryIssues) ?? (row.missing === null ? 'ok' : 'warning'),
      statusTitle: problems.length === 0 ? undefined : problems.join(' · '),
      chips: [...row.chips, ...issueChips(entryIssues)],
    };
  });

  return (
    <EntityList
      label={spec.label}
      items={items}
      selectedId={selectedId}
      onSelect={onSelect}
      onActivate={onActivate}
      onMove={(id, targetId) => {
        actions.moveEntryTo(category, id, targetId);
      }}
      addLabel={addLabelFor(category)}
      onAdd={onAdd}
      addDisabled={atLimit}
      addTitle={atLimit ? `Limit of ${LIMITS.entriesPerList} ${spec.noun}s reached` : undefined}
      emptyHint={spec.emptyHint}
    />
  );
}
