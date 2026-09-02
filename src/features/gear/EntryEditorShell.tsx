import type { ReactNode } from 'react';

import type { AnyEntry, GearListKey } from '@/domain/build';
import type { Contribution } from '@/domain/engine';
import { EditorActions, EditorFrame } from '@/components/EditorFrame';
import { InlineName } from '@/components/InlineName';
import { cx } from '@/lib/cx';

import { AbilityPreview } from './editors/AbilityPreview';
import { useEntryActions } from './useEntryActions';

/**
 * Editor card chrome shared by the six gear editors (plan A2.0 / D3): inline name with usage,
 * duplicate / move / delete actions and the collapsed ability preview footer.
 */
export function EntryEditorShell({
  list,
  entry,
  nameClassName,
  contributions,
  previewLabel,
  children,
}: {
  list: GearListKey;
  entry: AnyEntry;
  /** Rarity colour for the title. */
  nameClassName?: string | undefined;
  contributions: readonly Contribution[];
  previewLabel?: string | undefined;
  children: ReactNode;
}) {
  const entryActions = useEntryActions(list, entry);

  return (
    <EditorFrame
      title={
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <InlineName
            customName={entry.customName}
            autoName={entryActions.autoName}
            nameClassName={cx('text-[14px]', nameClassName ?? 'text-text')}
            onChange={(next) => {
              entryActions.rename(next);
            }}
          />
          <span className="shrink-0 text-[11px] text-muted" title={entryActions.usageTitle}>
            {entryActions.usage}
          </span>
        </div>
      }
      actions={
        <EditorActions
          duplicateDisabled={entryActions.atLimit}
          onDuplicate={() => {
            entryActions.duplicate();
          }}
          onDelete={() => {
            entryActions.remove();
          }}
        />
      }
      footer={<AbilityPreview contributions={contributions} label={previewLabel} />}
    >
      {children}
    </EditorFrame>
  );
}
