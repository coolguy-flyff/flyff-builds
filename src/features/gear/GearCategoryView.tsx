import { useEffect, useRef } from 'react';

import type { GearListKey } from '@/domain/build';
import { EmptyState } from '@/components/EmptyState';
import { useActions, useAppStore, useBuild } from '@/state';

import { focusFirstControl, scrollEditorIntoView } from './editorFocus';
import { GEAR_CATEGORIES, gearEntries } from './gearCategories';
import { GearEditor } from './GearEditor';
import { GearEntityList } from './GearEntityList';

/**
 * Master–detail view of one gear list (plan A2 / D3): the entry list on the left, the selected
 * entry's editor on the right (stacked on narrow screens). New entries are selected and focused.
 */
export function GearCategoryView({ category }: { category: GearListKey }) {
  const build = useBuild();
  const actions = useActions();
  const selectedId = useAppStore((state) => state.ui.selected[category]);
  const entries = gearEntries(build, category);
  const selectionExists = entries.some((entry) => entry.id === selectedId);
  const activeId = selectionExists ? selectedId : (entries[0]?.id ?? null);
  const editorRef = useRef<HTMLDivElement>(null);
  const pendingFocusRef = useRef<number | null>(null);
  const spec = GEAR_CATEGORIES[category];

  useEffect(() => {
    if (pendingFocusRef.current !== null && pendingFocusRef.current === activeId) {
      pendingFocusRef.current = null;
      focusFirstControl(editorRef.current);
    }
  }, [activeId]);

  return (
    <div className="grid items-start gap-3.5 lg:grid-cols-[310px_1fr]">
      <GearEntityList
        category={category}
        selectedId={activeId}
        onSelect={(id) => {
          actions.selectEntry(category, id);
          scrollEditorIntoView(editorRef.current);
        }}
        onActivate={() => {
          focusFirstControl(editorRef.current);
        }}
        onAdd={() => {
          pendingFocusRef.current = actions.addEntry(category);
        }}
      />
      <div ref={editorRef} className="min-w-0">
        {activeId === null ? (
          <EmptyState
            title={`No ${spec.noun} selected`}
            hint={`Add a ${spec.noun} on the left to start editing.`}
          />
        ) : (
          <GearEditor category={category} entryId={activeId} />
        )}
      </div>
    </div>
  );
}
