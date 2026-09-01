import { useEffect, useState } from 'react';

import { STAT_KEYS, type StatKey } from '@/data';
import { autoStatPageName, MIN_BASE_STAT, swapsReferencing, type StatPage } from '@/domain/build';
import { remainingStatPoints, totalStatPoints } from '@/domain/rules';
import { Button } from '@/components/Button';
import { Card } from '@/components/Card';
import { Chip } from '@/components/Chip';
import { InlineName } from '@/components/InlineName';
import { ProgressBar, type ProgressTone } from '@/components/ProgressBar';
import { Stepper } from '@/components/Stepper';
import { Hint } from '@/components/Text';
import { cx } from '@/lib/cx';
import { useActions, useBuild, useSelectors } from '@/state';

const STAT_LABELS: Record<StatKey, string> = { str: 'STR', sta: 'STA', dex: 'DEX', int: 'INT' };
const CLAMP_NOTE_MS = 2500;

function highestStat(page: StatPage): StatKey | null {
  let best: StatKey | null = null;

  for (const key of STAT_KEYS) {
    if (page[key] > MIN_BASE_STAT && (best === null || page[key] > page[best])) {
      best = key;
    }
  }

  return best;
}

interface Meter {
  readonly remaining: number;
  readonly total: number;
  readonly tone: ProgressTone;
  readonly note: string;
  readonly textClass: string;
}

function meterFor(level: number, page: StatPage): Meter {
  const total = totalStatPoints(level);
  const remaining = remainingStatPoints(level, page);
  let tone: ProgressTone;
  let note: string;
  let textClass: string;

  if (remaining === 0) {
    tone = 'ok';
    note = 'all points allocated';
    textClass = 'text-ok';
  } else if (remaining > 0) {
    tone = 'warn';
    note = `${remaining} unspent`;
    textClass = 'text-warn';
  } else {
    tone = 'danger';
    note = `Over-allocated by ${-remaining}`;
    textClass = 'text-danger';
  }

  return { remaining, total, tone, note, textClass };
}

function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

export function StatPageCard({
  page,
  expanded,
  onSelect,
}: {
  page: StatPage;
  expanded: boolean;
  onSelect: () => void;
}) {
  const build = useBuild();
  const actions = useActions();
  const selectors = useSelectors();
  const [clampNote, setClampNote] = useState<string | null>(null);
  const name = selectors.entryName(build, 'statPages', page.id);
  const meter = meterFor(build.character.level, page);
  const highest = highestStat(page);
  const swaps = swapsReferencing(build, 'statPages', page.id);
  const usage = `used by ${plural(swaps.length, 'swap')}`;
  const usageTitle = swaps
    .map((swap) => selectors.entryName(build, 'gearSwaps', swap.id))
    .join(', ');
  const onlyPage = build.statPages.length === 1;

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (clampNote !== null) {
      const timer = setTimeout(() => {
        setClampNote(null);
      }, CLAMP_NOTE_MS);

      cleanup = () => {
        clearTimeout(timer);
      };
    }

    return cleanup;
  }, [clampNote]);

  const remove = (): void => {
    if (swaps.length === 0) {
      actions.removeEntry('statPages', page.id);
    } else {
      const fallback = build.statPages.find((candidate) => candidate.id !== page.id);
      const fallbackName =
        fallback === undefined
          ? 'the first page'
          : selectors.entryName(build, 'statPages', fallback.id);

      actions.openDialog({
        kind: 'confirm',
        title: `Delete ${name}?`,
        message: `Used by ${plural(swaps.length, 'swap')} — those swaps will fall back to ${fallbackName}.`,
        confirmLabel: 'Delete page',
        danger: true,
        onConfirm: () => {
          actions.removeEntry('statPages', page.id);
        },
      });
    }
  };

  const meterBar = (
    <ProgressBar
      label={`${name} stat points`}
      fraction={(meter.total - meter.remaining) / meter.total}
      tone={meter.tone}
    />
  );

  const highlight =
    highest === null ? null : (
      <Chip tone="accent">
        {STAT_LABELS[highest]} {page[highest]}
      </Chip>
    );

  let card;

  if (expanded) {
    card = (
      <Card key="expanded" selected className="animate-card-in flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <InlineName
            customName={page.customName}
            autoName={autoStatPageName(build, page)}
            onChange={(next) => {
              actions.setCustomName('statPages', page.id, next);
            }}
            nameClassName="text-[14px] text-accent"
          />
          {highlight}
          <span className="text-[11px] text-muted" title={usageTitle}>
            {usage}
          </span>
          <div className="ml-auto flex gap-1.5">
            <Button
              size="sm"
              onClick={() => {
                actions.duplicateEntry('statPages', page.id);
              }}
            >
              Duplicate
            </Button>
            <Button
              size="sm"
              onClick={() => {
                actions.resetStatPage(page.id);
              }}
            >
              Reset
            </Button>
            <Button
              size="sm"
              variant="danger"
              disabled={onlyPage}
              title={onlyPage ? 'At least one stat page is required' : undefined}
              onClick={remove}
            >
              Delete
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {STAT_KEYS.map((stat) => {
            const isHighest = stat === highest;

            return (
              <div
                key={stat}
                className={cx(
                  'rounded-sub bg-sub px-3 py-2.5',
                  isHighest && 'outline-1 outline-accent/30',
                )}
              >
                <div
                  className={cx(
                    'mb-1.5 text-[11px] font-semibold',
                    isHighest ? 'text-accent' : 'text-muted',
                  )}
                >
                  {STAT_LABELS[stat]}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <Stepper
                    size="compact"
                    label={`${STAT_LABELS[stat]} on ${name}`}
                    value={page[stat]}
                    min={MIN_BASE_STAT}
                    max={page[stat] + Math.max(meter.remaining, 0)}
                    onChange={(value) => {
                      actions.setStat(page.id, stat, value);
                    }}
                    onClamp={(requested, applied) => {
                      if (requested > applied) {
                        setClampNote(`Clamped to ${applied} (no points remaining)`);
                      }
                    }}
                  />
                  <Button
                    size="xs"
                    variant="outline"
                    disabled={meter.remaining <= 0}
                    onClick={() => {
                      actions.maxStat(page.id, stat);
                    }}
                  >
                    Max
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
        <div>
          {meterBar}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 font-mono text-[11.5px]">
            <span className={meter.textClass}>
              Remaining {meter.remaining} / {meter.total}
            </span>
            <span className="text-dim">·</span>
            <span className={meter.textClass}>{meter.note}</span>
            {clampNote !== null && <span className="ml-auto text-warn">{clampNote}</span>}
          </div>
        </div>
        <Hint>Steppers: click ±1 · Shift ±10 · Ctrl ±100 · Max dumps all remaining points</Hint>
      </Card>
    );
  } else {
    card = (
      <Card
        key="collapsed"
        role="button"
        tabIndex={0}
        aria-label={`Select ${name}`}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            onSelect();
          }
        }}
        className="animate-card-in flex cursor-pointer flex-col gap-2.5 transition-colors hover:bg-sub"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[13.5px] font-semibold">{name}</span>
          {highlight}
          <span className="text-[11px] text-muted" title={usageTitle}>
            {usage}
          </span>
          <span className="ml-auto text-[10.5px] text-dim">click to expand</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {STAT_KEYS.map((stat) => (
            <div key={stat} className="rounded-sub bg-sub px-3 py-2">
              <div className="text-[10.5px] font-semibold text-muted">{STAT_LABELS[stat]}</div>
              <div className="font-mono text-[14px] font-semibold text-text">{page[stat]}</div>
            </div>
          ))}
        </div>
        {meterBar}
      </Card>
    );
  }

  return card;
}
