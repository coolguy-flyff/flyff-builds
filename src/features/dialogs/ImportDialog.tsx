import { useState } from 'react';

import { requireClass } from '@/data';
import type { ValidatedBuild } from '@/domain/build';
import { Button } from '@/components/Button';
import { AppDialog, DialogActions } from '@/components/Dialog';
import { ClassIcon } from '@/components/ItemIcon';
import { FieldLabel, Hint } from '@/components/Text';
import { pluralize } from '@/features/snapshots/format';
import { cx } from '@/lib/cx';
import { useActions, useGameData } from '@/state';

import { describeBuildCounts } from './buildSummary';
import { useImportPreview, type ImportPreview } from './useImportPreview';

const TEXTAREA_ID = 'import-share-code';

function ImportPreviewPanel({ validated }: { validated: ValidatedBuild }) {
  const data = useGameData();
  const { build, warnings } = validated;
  // A decoded build is validated, so its job is always known.
  const job = requireClass(data, build.character.jobId);

  return (
    <div>
      <div className="flex items-center gap-3 rounded-sub border border-accent/25 bg-accent/8 px-3 py-2.5">
        <ClassIcon icon={job.icon} size={34} alt="" />
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-semibold text-text">
            {job.name} · Lv {build.character.level}
          </div>
          <div className="font-mono text-[11px] text-muted">{describeBuildCounts(build)}</div>
        </div>
        <span className="shrink-0 text-[12px] font-medium text-ok">✓ Valid code</span>
      </div>
      {warnings.length > 0 && (
        <Hint tone="warn" className="mt-1.5">
          ⚠ {pluralize(warnings.length, 'adjustment')} will be made on import (items unknown to this
          version are dropped); the details follow as a notification.
        </Hint>
      )}
    </div>
  );
}

function PreviewStatus({ preview }: { preview: ImportPreview }) {
  let content = null;

  switch (preview.kind) {
    case 'empty':
      break;
    case 'checking':
      content = <Hint>Checking…</Hint>;
      break;
    case 'valid':
      content = <ImportPreviewPanel validated={preview.validated} />;
      break;
    case 'invalid':
      content = (
        <div
          role="status"
          className="rounded-control bg-danger/12 px-3 py-2 text-[12px] text-danger"
        >
          ✕ {preview.message}
        </div>
      );
      break;
  }

  return content;
}

/** Import dialog (plan A0.2 / D7): paste a link or code, preview it, replace the working build. */
export function ImportDialog({
  initialText,
  onClose,
}: {
  initialText: string;
  onClose: () => void;
}) {
  const data = useGameData();
  const actions = useActions();
  const [text, setText] = useState(initialText);
  const preview = useImportPreview(data, text);
  const validated = preview.kind === 'valid' ? preview.validated : null;

  const importBuild = (): void => {
    if (validated !== null) {
      actions.autoSnapshot('Autosave before import');
      actions.replaceBuild(validated.build, validated.warnings);
      onClose();
      actions.pushToast('success', 'Build imported');
    }
  };

  return (
    <AppDialog
      open
      onClose={onClose}
      title="Import"
      description="Paste a link or code. Your current build is kept as an automatic snapshot before importing."
    >
      <FieldLabel htmlFor={TEXTAREA_ID} className="mb-1.5">
        Link or code
      </FieldLabel>
      <textarea
        id={TEXTAREA_ID}
        autoFocus
        data-autofocus
        value={text}
        spellCheck={false}
        placeholder="https://…/?b=… or the bare code"
        onChange={(event) => {
          setText(event.currentTarget.value);
        }}
        className={cx(
          'block min-h-14 w-full resize-y rounded-control border bg-sub px-3 py-2 font-mono text-[12px] leading-relaxed text-text-2 outline-none placeholder:font-sans placeholder:text-dim',
          preview.kind === 'invalid' ? 'border-danger/40' : 'border-transparent',
        )}
      />
      <div className="mt-3 min-h-[52px]">
        <PreviewStatus preview={preview} />
      </div>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="primary" disabled={validated === null} onClick={importBuild}>
          Import — replaces working build
        </Button>
      </DialogActions>
    </AppDialog>
  );
}
