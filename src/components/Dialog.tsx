import { Description, Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react';
import type { ReactNode } from 'react';

import { cx } from '@/lib/cx';

export interface AppDialogProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode | undefined;
  width?: 'md' | 'lg' | undefined;
  children: ReactNode;
}

/** Modal panel (plan D7): dimmed backdrop, focus trap, Escape closes, focus returns on close. */
export function AppDialog({
  open,
  onClose,
  title,
  description,
  width = 'md',
  children,
}: AppDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} className="relative z-50">
      <DialogBackdrop
        transition
        className="fixed inset-0 bg-backdrop/80 transition-opacity data-[closed]:opacity-0"
      />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel
          transition
          className={cx(
            'w-full rounded-2xl bg-card px-6 py-[22px] shadow-panel transition data-[closed]:scale-95 data-[closed]:opacity-0',
            width === 'md' ? 'max-w-[530px]' : 'max-w-[760px]',
          )}
        >
          <div className="mb-1 flex items-start gap-3">
            <DialogTitle className="text-[16px] font-semibold text-text">{title}</DialogTitle>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="ml-auto text-[14px] text-dim hover:text-text"
            >
              ✕
            </button>
          </div>
          {description !== undefined && (
            <Description className="mb-4 text-[12px] text-muted">{description}</Description>
          )}
          {children}
        </DialogPanel>
      </div>
    </Dialog>
  );
}

export function DialogActions({ children }: { children: ReactNode }) {
  return <div className="mt-5 flex flex-wrap justify-end gap-2">{children}</div>;
}
