import { useEffect, useRef } from 'react';

import { cx } from '@/lib/cx';
import { useActions, useAppStore, type ToastKind } from '@/state';

const AUTO_DISMISS_MS = 6000;

const KIND_CLASSES: Record<ToastKind, string> = {
  info: 'border-accent',
  success: 'border-ok',
  warning: 'border-warn',
  error: 'border-danger',
};

/** Bottom-right toasts (plan D7); info/success/warning auto-dismiss, errors stay until closed. */
export function ToastHost() {
  const toasts = useAppStore((state) => state.ui.toasts);
  const actions = useActions();
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    const active = timers.current;
    const alive = new Set(toasts.map((toast) => toast.id));

    for (const [id, timer] of active) {
      if (!alive.has(id)) {
        clearTimeout(timer);
        active.delete(id);
      }
    }

    for (const toast of toasts) {
      if (toast.kind !== 'error' && !active.has(toast.id)) {
        active.set(
          toast.id,
          setTimeout(() => {
            active.delete(toast.id);
            actions.dismissToast(toast.id);
          }, AUTO_DISMISS_MS),
        );
      }
    }
  }, [toasts, actions]);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed right-4 bottom-4 z-40 flex w-[340px] max-w-[calc(100vw-2rem)] flex-col gap-2"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={cx(
            'pointer-events-auto rounded-sub border-l-2 bg-card px-3.5 py-3 shadow-panel',
            KIND_CLASSES[toast.kind],
          )}
        >
          <div className="flex items-start gap-2">
            <p className="flex-1 text-[12.5px] text-text">{toast.message}</p>
            <button
              type="button"
              aria-label="Dismiss"
              onClick={() => {
                actions.dismissToast(toast.id);
              }}
              className="text-[13px] text-dim hover:text-text"
            >
              ✕
            </button>
          </div>
          {toast.details !== undefined && toast.details.length > 0 && (
            <ul className="mt-1.5 flex flex-col gap-0.5 text-[11px] text-muted">
              {toast.details.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
