import { useEffect, useState, type ReactNode } from 'react';

import { Button, type ButtonProps } from '@/components/Button';

const COPIED_MS = 1500;

export interface CopyButtonProps extends Omit<ButtonProps, 'onClick' | 'children'> {
  /** Text written to the clipboard. */
  text: string;
  children: ReactNode;
  copiedLabel?: ReactNode | undefined;
  /** Called when the clipboard is unavailable or refuses the write; defaults to logging. */
  onCopyError?: ((error: unknown) => void) | undefined;
}

async function writeClipboard(text: string): Promise<void> {
  // Typed as always present, but missing on insecure origins and in some embedded browsers.
  const { clipboard } = navigator as Partial<Navigator>;

  if (clipboard === undefined) {
    throw new Error('The clipboard is unavailable in this browser');
  }

  await clipboard.writeText(text);
}

function logCopyError(error: unknown): void {
  console.error('Copy to clipboard failed', error);
}

/** Button that copies `text` and confirms with "Copied ✓" for a moment (plan D7). */
export function CopyButton({
  text,
  children,
  copiedLabel = 'Copied ✓',
  onCopyError = logCopyError,
  ...rest
}: CopyButtonProps) {
  const [copiedAt, setCopiedAt] = useState<number | null>(null);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (copiedAt !== null) {
      const timer = setTimeout(() => {
        setCopiedAt(null);
      }, COPIED_MS);

      cleanup = () => {
        clearTimeout(timer);
      };
    }

    return cleanup;
  }, [copiedAt]);

  const copy = (): void => {
    writeClipboard(text)
      .then(() => {
        setCopiedAt(Date.now());
      })
      .catch((error: unknown) => {
        onCopyError(error);
      });
  };

  return (
    <Button {...rest} aria-live="polite" onClick={copy}>
      {copiedAt === null ? children : copiedLabel}
    </Button>
  );
}
