import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Deterministic JSON writer: arrays as one record per line, objects as one entry per line, so the
 * committed tables produce reviewable diffs on data refreshes.
 */
export function formatTable(value: unknown): string {
  let text: string;

  if (Array.isArray(value)) {
    const lines = value.map((entry: unknown) => `  ${JSON.stringify(entry)}`);
    text = lines.length === 0 ? '[]\n' : `[\n${lines.join(',\n')}\n]\n`;
  } else if (value !== null && typeof value === 'object') {
    const lines = Object.entries(value).map(
      ([key, entry]) => `  ${JSON.stringify(key)}: ${JSON.stringify(entry)}`,
    );
    text = lines.length === 0 ? '{}\n' : `{\n${lines.join(',\n')}\n}\n`;
  } else {
    text = `${JSON.stringify(value)}\n`;
  }

  return text;
}

export interface DriftReport {
  changed: string[];
  missing: string[];
}

/** Compares the formatted tables with what is on disk (used by `--check`). */
export function detectDrift(outDir: string, files: Readonly<Record<string, string>>): DriftReport {
  const report: DriftReport = { changed: [], missing: [] };

  for (const [file, text] of Object.entries(files)) {
    const path = join(outDir, file);

    if (!existsSync(path)) {
      report.missing.push(file);
    } else if (readFileSync(path, 'utf8') !== text) {
      report.changed.push(file);
    }
  }

  return report;
}

/** Writes every table; all files or none (formatting happens before the first write). */
export function writeTables(outDir: string, files: Readonly<Record<string, string>>): void {
  mkdirSync(outDir, { recursive: true });

  for (const [file, text] of Object.entries(files)) {
    writeFileSync(join(outDir, file), text, 'utf8');
  }
}
