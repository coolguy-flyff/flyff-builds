import type { ResultsPage } from '@/domain/engine';

import { EMPTY_CELL, formatValue } from './format';
import { groupLabel, type ResultsRow } from './rowCatalog';

/**
 * Text exports of the visible rows and columns (plan A4.1): TSV and Markdown for the clipboard,
 * CSV for download. Every format appends a composition block — one line per swap listing what
 * it is made of — so a pasted table stays self-describing.
 */

export interface ExportColumn {
  readonly name: string;
  /** Composition chips of the swap (equipment set, weapon, …). */
  readonly composition: readonly string[];
  readonly page: ResultsPage;
}

export interface ExportComposition {
  readonly name: string;
  readonly parts: readonly string[];
}

export interface ExportTable {
  readonly header: readonly string[];
  readonly body: readonly (readonly string[])[];
  readonly composition: readonly ExportComposition[];
}

export type ExportFormat = 'tsv' | 'markdown' | 'csv';

const COMPOSITION_TITLE = 'Composition';
const COMPOSITION_SEPARATOR = ' · ';
const COMPOSITION_ARROW = ' → ';

export function buildExportTable(
  rows: readonly ResultsRow[],
  columns: readonly ExportColumn[],
): ExportTable {
  return {
    header: ['Group', 'Stat', ...columns.map((column) => column.name)],
    body: rows.map((row) => [
      groupLabel(row.group),
      row.label,
      ...columns.map((column) => formatValue(row.select(column.page), row.format)),
    ]),
    composition: columns.map((column) => ({ name: column.name, parts: column.composition })),
  };
}

function compositionText(entry: ExportComposition): string {
  return entry.parts.length === 0 ? EMPTY_CELL : entry.parts.join(COMPOSITION_SEPARATOR);
}

function tsvField(value: string): string {
  return value.replace(/[\t\r\n]+/g, ' ');
}

export function toTsv(table: ExportTable): string {
  const lines = [table.header, ...table.body].map((cells) => cells.map(tsvField).join('\t'));

  lines.push('', COMPOSITION_TITLE);

  for (const entry of table.composition) {
    lines.push(`${tsvField(entry.name)}\t${tsvField(compositionText(entry))}`);
  }

  return lines.join('\n');
}

function markdownField(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/[\r\n]+/g, ' ');
}

function markdownRow(cells: readonly string[]): string {
  return `| ${cells.map(markdownField).join(' | ')} |`;
}

export function toMarkdown(table: ExportTable): string {
  const lines = [
    markdownRow(table.header),
    `| ${table.header.map(() => '---').join(' | ')} |`,
    ...table.body.map(markdownRow),
    '',
    `**${COMPOSITION_TITLE}**`,
    '',
  ];

  for (const entry of table.composition) {
    lines.push(
      `- **${markdownField(entry.name)}**${COMPOSITION_ARROW}${markdownField(compositionText(entry))}`,
    );
  }

  return lines.join('\n');
}

/** RFC 4180: fields containing a comma, a quote or a line break are quoted, quotes doubled. */
export function csvField(value: string): string {
  let field = value;

  if (/[",\r\n]/.test(value)) {
    field = `"${value.replace(/"/g, '""')}"`;
  }

  return field;
}

function csvRow(cells: readonly string[]): string {
  return cells.map(csvField).join(',');
}

export function toCsv(table: ExportTable): string {
  const lines = [csvRow(table.header), ...table.body.map(csvRow), '', COMPOSITION_TITLE];

  for (const entry of table.composition) {
    lines.push(csvRow([entry.name, compositionText(entry)]));
  }

  return lines.join('\r\n');
}

export function renderExport(format: ExportFormat, table: ExportTable): string {
  let text: string;

  switch (format) {
    case 'tsv':
      text = toTsv(table);
      break;
    case 'markdown':
      text = toMarkdown(table);
      break;
    case 'csv':
      text = toCsv(table);
      break;
  }

  return text;
}
