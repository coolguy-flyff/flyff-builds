import type { ReactNode } from 'react';

import { Button } from './Button';
import { Card } from './Card';

/** Editor card (plan D3): title row with actions, then a two-column sub-card grid. */
export function EditorFrame({
  title,
  actions,
  children,
  footer,
}: {
  title: ReactNode;
  actions?: ReactNode | undefined;
  children: ReactNode;
  footer?: ReactNode | undefined;
}) {
  return (
    <Card padding="editor">
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <div className="min-w-0 flex-1">{title}</div>
        {actions !== undefined && <div className="flex items-center gap-1.5">{actions}</div>}
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{children}</div>
      {footer !== undefined && <div className="mt-3">{footer}</div>}
    </Card>
  );
}

/** Duplicate / Delete for an editor card; reordering is drag & drop on the list itself. */
export function EditorActions({
  onDuplicate,
  onDelete,
  duplicateDisabled = false,
  deleteDisabled = false,
  deleteTitle,
}: {
  onDuplicate: () => void;
  onDelete: () => void;
  duplicateDisabled?: boolean | undefined;
  deleteDisabled?: boolean | undefined;
  deleteTitle?: string | undefined;
}) {
  return (
    <>
      <Button size="sm" onClick={onDuplicate} disabled={duplicateDisabled}>
        Duplicate
      </Button>
      <Button
        size="sm"
        variant="danger"
        onClick={onDelete}
        disabled={deleteDisabled}
        title={deleteTitle}
      >
        Delete
      </Button>
    </>
  );
}
