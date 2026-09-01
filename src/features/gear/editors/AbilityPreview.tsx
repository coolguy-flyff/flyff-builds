import type { GameData } from '@/data';
import { formatAbility, shortStatLabel } from '@/domain/build';
import type { Contribution } from '@/domain/engine';
import { Hint } from '@/components/Text';
import { Tooltip } from '@/components/Tooltip';
import { useGameData } from '@/state';

interface PreviewLine {
  readonly parameter: string;
  readonly rate: boolean;
  readonly add: number;
  readonly sources: string[];
}

/** Contributions merged per stat, sorted by stat label, with the sources kept for the tooltip. */
function previewLines(data: GameData, contributions: readonly Contribution[]): PreviewLine[] {
  const merged = new Map<string, PreviewLine>();

  for (const contribution of contributions) {
    const key = `${contribution.parameter}:${contribution.rate}`;
    const existing = merged.get(key);

    if (existing === undefined) {
      merged.set(key, {
        parameter: contribution.parameter,
        rate: contribution.rate,
        add: contribution.add,
        sources: [contribution.origin.label],
      });
    } else {
      merged.set(key, {
        ...existing,
        add: existing.add + contribution.add,
        sources: existing.sources.includes(contribution.origin.label)
          ? existing.sources
          : [...existing.sources, contribution.origin.label],
      });
    }
  }

  return [...merged.values()].sort((a, b) =>
    shortStatLabel(data, a.parameter).localeCompare(shortStatLabel(data, b.parameter)),
  );
}

/**
 * Collapsed audit of what an entry expands to (plan A2.0): totals per stat, sorted by stat name;
 * hovering a line lists the sources it sums.
 */
export function AbilityPreview({
  contributions,
  label = 'Ability preview',
}: {
  contributions: readonly Contribution[];
  label?: string | undefined;
}) {
  const data = useGameData();
  const lines = previewLines(data, contributions);
  let body;

  if (lines.length === 0) {
    body = (
      <Hint className="mt-2">Nothing yet — configure the entry to see what it contributes.</Hint>
    );
  } else {
    body = (
      <ul className="mt-2 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {lines.map((line) => (
          <li key={`${line.parameter}-${line.rate}`} className="flex min-w-0 text-[11.5px]">
            <Tooltip
              className="w-full items-baseline gap-2"
              content={
                <ul className="flex flex-col gap-0.5">
                  {line.sources.map((source) => (
                    <li key={source}>{source}</li>
                  ))}
                </ul>
              }
            >
              <span className="shrink-0 font-mono font-medium text-accent">
                {formatAbility(data, line.parameter, line.add, line.rate)}
              </span>
              <span className="truncate text-dim">{line.sources.join(', ')}</span>
            </Tooltip>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <details className="group">
      <summary className="cursor-pointer list-none text-[12px] text-muted select-none hover:text-text [&::-webkit-details-marker]:hidden">
        <span
          aria-hidden="true"
          className="mr-1 inline-block transition-transform group-open:rotate-90"
        >
          ▸
        </span>
        {label} — {lines.length} stat{lines.length === 1 ? '' : 's'}
      </summary>
      {body}
    </details>
  );
}
