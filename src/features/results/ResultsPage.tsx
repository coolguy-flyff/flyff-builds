import { useMemo } from 'react';

import type { BuildState } from '@/domain/build';
import {
  computeAllResults,
  DEFAULT_ENGINE_OPTIONS,
  listDamageTargets,
  type EngineOptions,
} from '@/domain/engine';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { memoByRef } from '@/lib/memo';
import { filterDifferingRows } from '@/results/compare';
import { buildExportTable, renderExport, type ExportFormat } from '@/results/export';
import { buildRows, groupRows } from '@/results/rowCatalog';
import { useActions, useAppStore, useBuild, useGameData, useSelectors } from '@/state';

import { buildColumns, engineFootnotes, petGraceHint, visibleColumns } from './columns';
import {
  copyText,
  CSV_FILENAME,
  CSV_MIME_TYPE,
  describeError,
  downloadTextFile,
  exportOption,
} from './exportActions';
import { describeOverridePet } from './overridePets';
import { usePremiumQuickToggles } from './premiumQuickToggles';
import { ResultsTable } from './ResultsTable';
import { ResultsToolbar } from './ResultsToolbar';
import {
  effectiveBaseline,
  setMembership,
  toggleMembership,
  withPetOverride,
  withSkillVariation,
} from './viewState';

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
  const premium = usePremiumQuickToggles();
  const options = useMemo(
    (): EngineOptions => ({
      ...DEFAULT_ENGINE_OPTIONS,
      petGrace: view.petGrace,
      target: view.damageTarget,
      customTargets: build.pvpTargets,
      partySkill: view.partySkill,
    }),
    [view.petGrace, view.damageTarget, build.pvpTargets, view.partySkill],
  );
  const resultsOf = useMemo(
    () => memoByRef((current: BuildState) => computeAllResults(data, current, options)),
    [data, options],
  );
  const effectiveBuild = useMemo(
    () => withPetOverride(build, view.petOverride),
    [build, view.petOverride],
  );
  const results = resultsOf(effectiveBuild);
  const columns = buildColumns(data, effectiveBuild, selectors, results);
  const visible = visibleColumns(columns, view.hiddenSwapIds);
  const pages = visible.map((column) => column.result.page);
  const allRows = buildRows(data, results, {
    showRawTotals: view.showRawTotals,
    skillVariations: view.skillVariations,
  });
  const rows = view.onlyDiffering ? filterDifferingRows(allRows, pages) : allRows;
  const targets = useMemo(
    () => listDamageTargets(build.character.level, build.pvpTargets),
    [build.character.level, build.pvpTargets],
  );
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
      <div className="flex min-h-0 flex-1 flex-col items-center gap-3">
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
          showSwapDetails={view.showSwapDetails}
          onOpenSwap={onOpenSwap}
          onMoveSwap={(swapId, targetSwapId) => {
            actions.moveEntryTo('gearSwaps', swapId, targetSwapId);
          }}
          onSelectVariant={(key, value) => {
            actions.updateResultsView({
              skillVariations: withSkillVariation(view.skillVariations, Number(key), Number(value)),
            });
          }}
          targets={targets}
          damageTarget={view.damageTarget}
          onSelectTarget={(choice) => {
            actions.updateResultsView({ damageTarget: choice });
          }}
          onEditTargets={() => {
            actions.openDialog({ kind: 'pvpTargets' });
          }}
          partySkill={view.partySkill}
          onSelectPartySkill={(partySkill) => {
            actions.updateResultsView({ partySkill });
          }}
        />
        {footnotes.length > 0 && (
          <p className="text-[11.5px] text-dim">{footnotes.join(FOOTNOTE_SEPARATOR)}</p>
        )}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      {results.length > 0 && (
        <div className="mx-auto w-full max-w-[1400px]">
          <ResultsToolbar
            view={view}
            columns={columns.map((column) => ({
              swapId: column.swapId,
              name: column.name,
              hidden: !visible.includes(column),
            }))}
            baselineSwapId={baselineSwapId}
            pets={build.pets.map((pet) => describeOverridePet(data, pet))}
            petGraceHint={petGraceHint(data)}
            premium={premium}
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
        </div>
      )}
      {content}
    </div>
  );
}
