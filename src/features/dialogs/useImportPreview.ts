import { useEffect, useState } from 'react';

import type { GameData } from '@/data';
import type { ValidatedBuild } from '@/domain/build';
import { decodeShareCode } from '@/share';

/** Keystrokes closer together than this share one decode. */
export const IMPORT_DEBOUNCE_MS = 150;

export type ImportPreview =
  | { readonly kind: 'empty' }
  | { readonly kind: 'checking' }
  | { readonly kind: 'valid'; readonly validated: ValidatedBuild }
  | { readonly kind: 'invalid'; readonly message: string };

interface Decoded {
  /** The (trimmed) input the preview belongs to; anything else on screen is stale. */
  readonly text: string;
  readonly preview: ImportPreview;
}

const EMPTY: ImportPreview = { kind: 'empty' };
const CHECKING: ImportPreview = { kind: 'checking' };

/**
 * Live validation of the Import textarea (plan A0.2): debounced decoding whose result is only shown
 * while it still matches the input, so a slow decode never overwrites a newer one.
 */
export function useImportPreview(data: GameData, text: string): ImportPreview {
  const [decoded, setDecoded] = useState<Decoded | null>(null);
  const input = text.trim();

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (input !== '') {
      let stale = false;
      const timer = setTimeout(() => {
        decodeShareCode(data, input)
          .then((result) => {
            if (!stale) {
              setDecoded({
                text: input,
                preview: result.ok
                  ? { kind: 'valid', validated: result.value }
                  : { kind: 'invalid', message: result.error.message },
              });
            }
          })
          .catch((error: unknown) => {
            // decodeShareCode only rejects on programmer errors; log them and stop showing "Checking…".
            console.error('Share code decoding failed', error);

            if (!stale) {
              setDecoded({
                text: input,
                preview: { kind: 'invalid', message: 'This code could not be read' },
              });
            }
          });
      }, IMPORT_DEBOUNCE_MS);

      cleanup = () => {
        stale = true;
        clearTimeout(timer);
      };
    }

    return cleanup;
  }, [data, input]);

  let preview: ImportPreview;

  if (input === '') {
    preview = EMPTY;
  } else if (decoded !== null && decoded.text === input) {
    preview = decoded.preview;
  } else {
    preview = CHECKING;
  }

  return preview;
}
