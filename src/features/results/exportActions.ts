import { requireDefined } from '@/lib/assert';
import type { ExportFormat } from '@/results/export';

/** The `Export ▾` menu entries (plan A4.1) and the browser side of delivering them. */

export type ExportDelivery = 'clipboard' | 'download';

export interface ExportOption {
  readonly format: ExportFormat;
  readonly label: string;
  /** Used in toasts: "Copied as TSV". */
  readonly shortLabel: string;
  readonly delivery: ExportDelivery;
}

export const EXPORT_OPTIONS: readonly ExportOption[] = [
  { format: 'tsv', label: 'Copy as TSV', shortLabel: 'TSV', delivery: 'clipboard' },
  { format: 'markdown', label: 'Copy as Markdown', shortLabel: 'Markdown', delivery: 'clipboard' },
  { format: 'csv', label: 'Download CSV', shortLabel: 'CSV', delivery: 'download' },
];

export const CSV_FILENAME = 'flyff-builds-results.csv';
export const CSV_MIME_TYPE = 'text/csv;charset=utf-8';

export function exportOption(format: ExportFormat): ExportOption {
  return requireDefined(
    EXPORT_OPTIONS.find((option) => option.format === format),
    `Unknown export format ${format}`,
  );
}

/** Rejects when the Clipboard API is unavailable or the browser denies access. */
export function copyText(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}

/** Saves `text` through a temporary object URL and a transient download link. */
export function downloadTextFile(filename: string, text: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mimeType }));
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    URL.revokeObjectURL(url);
  }
}

export function describeError(error: unknown): string {
  let message = 'Unknown error';

  if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  return message;
}
