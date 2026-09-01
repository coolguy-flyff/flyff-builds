import { useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/Button';
import { CopyButton } from '@/components/CopyButton';
import { AppDialog, DialogActions } from '@/components/Dialog';
import { FieldLabel, Hint } from '@/components/Text';
import { cx } from '@/lib/cx';
import { buildShareUrl, encodeShareCode } from '@/share';
import { useActions, useBuild, useGameData } from '@/state';

import { selectElementText } from './selectText';
import { errorMessage, shareBaseUrl } from './shareLink';

const ENCODING_PLACEHOLDER = 'Encoding…';

function ShareField({
  label,
  value,
  copyLabel,
  singleLine = false,
  hint,
}: {
  label: string;
  /** `null` while the code is still being encoded. */
  value: string | null;
  copyLabel: string;
  singleLine?: boolean | undefined;
  hint?: ReactNode | undefined;
}) {
  const actions = useActions();
  const boxRef = useRef<HTMLDivElement>(null);

  const onCopyError = (error: unknown): void => {
    actions.pushToast(
      'error',
      `Could not copy the ${label.toLowerCase()} — it is selected below, copy it manually.`,
      [errorMessage(error)],
    );

    if (boxRef.current !== null) {
      selectElementText(boxRef.current);
    }
  };

  return (
    <div>
      <FieldLabel className="mb-1.5">{label}</FieldLabel>
      <div className="flex items-start gap-2">
        <div
          ref={boxRef}
          aria-label={label}
          aria-busy={value === null}
          className={cx(
            'min-w-0 flex-1 rounded-control bg-sub px-3 py-2 font-mono text-[11.5px] leading-relaxed select-all',
            value === null ? 'text-dim' : 'text-text-2',
            singleLine ? 'truncate' : 'break-all',
          )}
        >
          {value ?? ENCODING_PLACEHOLDER}
        </div>
        <CopyButton
          text={value ?? ''}
          disabled={value === null}
          onCopyError={onCopyError}
          className="shrink-0"
        >
          {copyLabel}
        </CopyButton>
      </div>
      {hint !== undefined && <Hint className="mt-1.5">{hint}</Hint>}
    </div>
  );
}

/** Share dialog (plan A0.2 / D7): the working build as a link and as a bare code. */
export function ShareDialog({ onClose }: { onClose: () => void }) {
  const data = useGameData();
  const build = useBuild();
  const actions = useActions();
  const [code, setCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    encodeShareCode(data, build)
      .then((encoded) => {
        if (!cancelled) {
          setCode(encoded);
        }
      })
      .catch((error: unknown) => {
        console.error('Share encoding failed', error);

        if (!cancelled) {
          actions.pushToast('error', 'Could not create a share code for this build', [
            errorMessage(error),
          ]);
          onClose();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [data, build, actions, onClose]);

  const link = code === null ? null : buildShareUrl(shareBaseUrl(window.location), code);

  return (
    <AppDialog
      open
      onClose={onClose}
      title="Share"
      description="Shares the working build only — snapshots stay on this device."
    >
      <div className="flex flex-col gap-4">
        <ShareField label="Link" value={link} copyLabel="Copy link" singleLine />
        <ShareField
          label="Code"
          value={code}
          copyLabel="Copy code"
          hint="Paste this code in Import on any device."
        />
      </div>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </AppDialog>
  );
}
