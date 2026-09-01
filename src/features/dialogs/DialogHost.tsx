import { useCallback } from 'react';

import { useActions, useAppStore } from '@/state';

import { ConfirmDialog } from './ConfirmDialog';
import { ImportDialog } from './ImportDialog';
import { SaveAsDialog } from './SaveAsDialog';
import { ShareDialog } from './ShareDialog';
import { SnapshotsDialog } from './SnapshotsDialog';

/** Renders whichever dialog the UI state asks for (plan D7). */
export function DialogHost() {
  const dialog = useAppStore((state) => state.ui.dialog);
  const actions = useActions();

  const close = useCallback((): void => {
    actions.closeDialog();
  }, [actions]);

  let content = null;

  if (dialog !== null) {
    switch (dialog.kind) {
      case 'confirm':
        content = <ConfirmDialog dialog={dialog} onClose={close} />;
        break;
      case 'share':
        content = <ShareDialog onClose={close} />;
        break;
      case 'import':
        content = <ImportDialog initialText={dialog.initialText} onClose={close} />;
        break;
      case 'saveAs':
        content = <SaveAsDialog onClose={close} />;
        break;
      case 'snapshots':
        content = <SnapshotsDialog onClose={close} />;
        break;
    }
  }

  return content;
}
