import { useMemo } from 'react';

import type { BuildState } from '@/domain/build';
import { computeAllResults } from '@/domain/engine';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { memoByRef } from '@/lib/memo';
import { filterDifferingRows } from '@/results/compare';
import { buildExportTable, renderExport, type ExportFormat } from '@/results/export';
import { buildRows, groupRows } from '@/results/rowCatalog';
import { useActions, useAppStore, useBuild, useGameData, useSelectors } from '@/state';

import { buildColumns, engineFootnotes, visibleColumns } from './columns';
import {
  copyText,
  CSV_FILENAME,
  CSV_MIME_TYPE,
  describeError,
  downloadTextFile,
  exportOption,
} from './exportActions';
import { ResultsTable } from './ResultsTable';
import { ResultsToolbar } from './ResultsToolbar';
import { effectiveBaseline, setMembership, toggleMembership } from './viewState';

export interface ResultsPageProps {
  /** Jumps to the Buffs & Swaps tab, expanding the given swap (or just the tab when `null`). */
  onOpenSwap: (swapId: number | null) => void;
}

const FOOTNOTE_SEPARATOR = ' · ';

/** Results tab (plan A4 / D6): every included swap's final stats side by side. */
export function ResultsPage({ onOpenSwap }: ResultsPageProps) {
  const data = useGameData();
  const build = useBuild();
  const selectors = useSelectors();
  const actions = useActions();
  const view = useAppStore((state) => state.ui.results);
  const resultsOf = useMemo(
    () => memoByRef((current: BuildState) => computeAllResults(data, current)),
    [data],
  );
  const results = resultsOf(build);
  const columns = buildColumns(data, build, selectors, results);
  const visible = visibleColumns(columns, view.hiddenSwapIds);
  const pages = visible.map((column) => column.result.page);
  const allRows = buildRows(data, results, { showRawTotals: view.showRawTotals });
  const rows = view.onlyDiffering ? filterDifferingRows(allRows, pages) : allRows;
  const baselineSwapId = effectiveBaseline(
    view.baselineSwapId,
    visible.map((column) => column.swapId),
  );
  const footnotes = engineFootnotes(visible);

  const copyToClipboard = async (text: string, label: string): Promise<void> => {
    try {
      await copyText(text);
      actions.pushToast('success', `Copied as ${label}`);
    } catch (error) {
      actions.pushToast('error', `Could not copy as ${label}`, [describeError(error)]);
    }
  };

  const exportResults = (format: ExportFormat): void => {
    const option = exportOption(format);
    const table = buildExportTable(
      rows,
      visible.map((column) => ({
        name: column.name,
        composition: column.composition,
        page: column.result.page,
      })),
    );
    const text = renderExport(format, table);

    if (option.delivery === 'download') {
      downloadTextFile(CSV_FILENAME, text, CSV_MIME_TYPE);
    } else {
      void copyToClipboard(text, option.shortLabel);
    }
  };

  let content;

  if (results.length === 0) {
    content = (
      <EmptyState
        title="Add a gear swap on the Buffs & Swaps tab to see results."
        action={
          <Button
            variant="soft"
            onClick={() => {
              onOpenSwap(null);
            }}
          >
            Go to Buffs &amp; Swaps
          </Button>
        }
      />
    );
  } else if (visible.length === 0) {
    content = (
      <EmptyState
        title="All swaps hidden — show swaps"
        action={
          <Button
            variant="soft"
            onClick={() => {
              actions.updateResultsView({ hiddenSwapIds: [] });
            }}
          >
            Show all swaps
          </Button>
        }
      />
    );
  } else {
    content = (
      <>
        <ResultsTable
          groups={groupRows(rows)}
          columns={visible}
          highlightBest={view.highlightBest}
          baselineSwapId={baselineSwapId}
          collapsedGroups={view.collapsedGroups}
          onToggleGroup={(groupId) => {
            actions.updateResultsView({
              collapsedGroups: toggleMembership(view.collapsedGroups, groupId),
            });
          }}
          onOpenSwap={onOpenSwap}
        />
        {footnotes.length > 0 && (
          <p className="text-[11.5px] text-dim">{footnotes.join(FOOTNOTE_SEPARATOR)}</p>
        )}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {results.length > 0 && (
        <ResultsToolbar
          view={view}
          columns={columns.map((column) => ({
            swapId: column.swapId,
            name: column.name,
            hidden: !visible.includes(column),
          }))}
          baselineSwapId={baselineSwapId}
          onViewChange={(patch) => {
            actions.updateResultsView(patch);
          }}
          onColumnVisibility={(swapId, isVisible) => {
            actions.updateResultsView({
              hiddenSwapIds: setMembership(view.hiddenSwapIds, swapId, !isVisible),
            });
          }}
          onExport={exportResults}
        />
      )}
      {content}
    </div>
  );
}
