import { useState, type ReactNode } from 'react';

import {
  accessoryLinesFor,
  getItem,
  type AccessorySet,
  type EarringVariant,
  type NecklaceVariant,
} from '@/data';
import {
  ACCESSORY_PIECE_KEYS,
  accessorySetShortName,
  type AccessoryPieceKey,
  type AccessorySetEntry,
} from '@/domain/build';
import { resolveAccessorySetEntry } from '@/domain/engine';
import {
  accessoryPieceAbilities,
  accessoryPieceItemId,
  accessoryPieceSet,
  accessoryPieceSource,
  accessoryPieceSourceId,
  accessorySlotOf,
  accessoryUpgradeBounds,
  clampAccessoryUpgrade,
  findAccessorySet,
  hasMixedAccessoryPieces,
  necklaceVariantsOf,
} from '@/domain/rules';
import { cx } from '@/lib/cx';
import { SubCard } from '@/components/Card';
import { EntityCombobox } from '@/components/EntityCombobox';
import { ItemIcon } from '@/components/ItemIcon';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { Select, type SelectOption } from '@/components/Select';
import { Hint } from '@/components/Text';
import { Tooltip } from '@/components/Tooltip';
import { useActions, useGameData } from '@/state';

import { EntryEditorShell } from '../EntryEditorShell';
import { formatAbilityList, formatSetBonusByTier, ringSignature } from '../format';
import { PieceUpgradeRow } from './PieceUpgradeRow';

const EARRING_OPTIONS: readonly SegmentOption<EarringVariant>[] = [
  { value: 'plug', label: 'Plug' },
  { value: 'demol', label: 'Demol' },
];

const NECKLACE_LABELS: Readonly<Record<NecklaceVariant, string>> = {
  gore: 'Gore',
  mental: 'Mental',
  peision: 'Peision',
};

const PIECE_LABELS: Readonly<Record<AccessoryPieceKey, string>> = {
  ring1: 'Ring 1',
  earring1: 'Earring 1',
  necklace: 'Necklace',
  earring2: 'Earring 2',
  ring2: 'Ring 2',
};

/** The `Select` value of a piece with nothing to wear; only offered while the entry has no set. */
const NO_SOURCE_VALUE = '';

/** A set without a Peision necklace (Adept's, Marksman's) doesn't offer the option at all. */
function necklaceOptions(set: AccessorySet | null): SegmentOption<NecklaceVariant>[] {
  return necklaceVariantsOf(set).map((variant) => ({
    value: variant,
    label: NECKLACE_LABELS[variant],
  }));
}

function setKey(set: AccessorySet): number {
  return set.id;
}

function setLabel(set: AccessorySet): string {
  return accessorySetShortName(set.name);
}

function SetOptionRow({ set }: { set: AccessorySet }) {
  const data = useGameData();
  const ring = getItem(data, set.ring);

  return (
    <div className="flex items-center gap-2.5">
      {ring !== undefined && <ItemIcon icon={ring.icon} size={24} />}
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold">{setLabel(set)}</div>
        <div className="truncate font-mono text-[10.5px] text-dim">{ringSignature(data, ring)}</div>
      </div>
    </div>
  );
}

/**
 * Accessory set editor (plan A2.4, revised): the set pick plus one section with the five pieces in
 * wear order — Ring 1, Earring 1, Necklace, Earring 2, Ring 2 — each with its own upgrade. "Mix &
 * match" (plan feedback 2026-09-03) is the optional extra step: it reveals a source select per
 * piece so a Defender's ring or a Speedo earring can join an otherwise full Adept's set. The step
 * can't be closed while a piece is mixed in — the selects are what shows it.
 */
export function AccessorySetEditor({ entry }: { entry: AccessorySetEntry }) {
  const data = useGameData();
  const actions = useActions();
  const mixed = hasMixedAccessoryPieces(entry);
  const [mixing, setMixing] = useState(mixed);
  const set = findAccessorySet(data, entry.setId);
  const ring = set === null ? undefined : getItem(data, set.ring);
  const resolution = resolveAccessorySetEntry(data, entry);
  const showSources = mixing || mixed;

  const update = (recipe: (draft: AccessorySetEntry) => void): void => {
    actions.updateEntry('accessorySets', entry.id, recipe);
  };

  /** Keeps the necklace variant valid for whichever set the necklace now comes from. */
  const clampNecklace = (draft: AccessorySetEntry): void => {
    const necklaceSet = accessoryPieceSet(data, draft, 'necklace');

    if (necklaceSet !== null && !necklaceVariantsOf(necklaceSet).includes(draft.necklace)) {
      draft.necklace = 'gore';
    }
  };

  /** Keeps a piece's upgrade inside its source's range (a CW jewel only exists at "+1"…"+5"). */
  const clampUpgrade = (draft: AccessorySetEntry, piece: AccessoryPieceKey): void => {
    draft.upgrades[piece] = clampAccessoryUpgrade(
      accessoryPieceSource(data, draft, piece),
      draft.upgrades[piece],
    );
  };

  const pieceAbilities = (piece: AccessoryPieceKey): string => {
    const source = accessoryPieceSource(data, entry, piece);
    const itemId = accessoryPieceItemId(data, entry, piece);
    const item = itemId === undefined ? undefined : getItem(data, itemId);

    return source === null || item === undefined
      ? '—'
      : formatAbilityList(data, accessoryPieceAbilities(source, item, entry.upgrades[piece]));
  };

  /** The four sets, then the CW jewel lines of the piece's slot. */
  const sourceOptions = (piece: AccessoryPieceKey): SelectOption[] => [
    ...(set === null ? [{ value: NO_SOURCE_VALUE, label: 'None' }] : []),
    ...data.accessorySets.map((candidate) => ({
      value: String(candidate.id),
      label: setLabel(candidate),
    })),
    ...accessoryLinesFor(data, accessorySlotOf(piece)).map((line) => ({
      value: String(line.id),
      label: line.name,
    })),
  ];

  const sourceSelect = (piece: AccessoryPieceKey): ReactNode => (
    <span className="w-[150px] shrink-0">
      <Select
        size="sm"
        label={`${PIECE_LABELS[piece]} source`}
        value={String(accessoryPieceSourceId(entry, piece) ?? NO_SOURCE_VALUE)}
        options={sourceOptions(piece)}
        onChange={(value) => {
          update((draft) => {
            const sourceId = value === NO_SOURCE_VALUE ? null : Number(value);

            // Taking the piece from the entry's own set is the unmixed state, not an override.
            draft.pieceSources[piece] = sourceId === draft.setId ? null : sourceId;
            clampUpgrade(draft, piece);
            clampNecklace(draft);
          });
        }}
      />
    </span>
  );

  /** Plug/Demol and Gore/Mental/Peision are set variants; a CW jewel has none. */
  const variantControl = (piece: AccessoryPieceKey): ReactNode => {
    let control: ReactNode = null;

    if (accessoryPieceSource(data, entry, piece)?.kind === 'line') {
      control = null;
    } else if (piece === 'earring1' || piece === 'earring2') {
      control = (
        <SegmentedControl
          label={`${PIECE_LABELS[piece]} type`}
          options={EARRING_OPTIONS}
          value={entry[piece]}
          onChange={(variant) => {
            update((draft) => {
              draft[piece] = variant;
            });
          }}
        />
      );
    } else if (piece === 'necklace') {
      control = (
        <SegmentedControl
          label="Necklace type"
          options={necklaceOptions(accessoryPieceSet(data, entry, 'necklace'))}
          value={entry.necklace}
          onChange={(variant) => {
            update((draft) => {
              draft.necklace = variant;
            });
          }}
        />
      );
    }

    return control;
  };

  const searchText = (candidate: AccessorySet): string =>
    `${candidate.name} ${ringSignature(data, getItem(data, candidate.ring))}`;

  let mixLabel = 'mix & match ▾';

  if (mixed) {
    mixLabel = 'mixed set';
  } else if (showSources) {
    mixLabel = 'done mixing ▴';
  }

  const mixButton = (
    <button
      type="button"
      aria-expanded={showSources}
      disabled={mixed}
      onClick={() => {
        setMixing((value) => !value);
      }}
      className={cx(
        'font-sans text-[11px] font-medium',
        mixed ? 'text-muted' : 'text-accent hover:underline',
      )}
    >
      {mixLabel}
    </button>
  );

  // Sits on the "Pieces" title line (the sub-card's status slot), not in a row of its own.
  const mixControl = mixed ? (
    <Tooltip
      placement="bottom"
      content={
        set === null
          ? 'Pick a set and take every piece from it to finish mixing'
          : `Take every piece from ${setLabel(set)} to finish mixing`
      }
    >
      {mixButton}
    </Tooltip>
  ) : (
    mixButton
  );

  return (
    <EntryEditorShell
      list="accessorySets"
      entry={entry}
      contributions={resolution.contributions}
      previewLabel="Per-piece resolved abilities"
    >
      <SubCard label="Set" note="all 5 pieces worn" span>
        <EntityCombobox
          options={data.accessorySets}
          value={set}
          getKey={setKey}
          getLabel={setLabel}
          getSearchText={searchText}
          renderOption={(option) => <SetOptionRow set={option} />}
          leading={ring === undefined ? undefined : <ItemIcon icon={ring.icon} size={26} />}
          meta={set === null ? undefined : ringSignature(data, ring)}
          placeholder="Pick a set…"
          allowNone
          label="Accessory set"
          onChange={(next) => {
            update((draft) => {
              draft.setId = next === null ? null : next.id;

              for (const piece of ACCESSORY_PIECE_KEYS) {
                // A piece already taken from the new set simply follows it now.
                if (draft.pieceSources[piece] === draft.setId) {
                  draft.pieceSources[piece] = null;
                }

                clampUpgrade(draft, piece);
              }

              clampNecklace(draft);
            });
          }}
        />
        <Hint className="mt-1.5">
          {set === null ? 'Pick a set to see its bonuses' : formatSetBonusByTier(data, set.bonus)}
        </Hint>
      </SubCard>
      <SubCard
        label="Pieces"
        note={
          showSources
            ? 'each piece from its own set or CW jewel — set bonuses count per set'
            : undefined
        }
        status={mixControl}
        span
      >
        <div className="flex flex-col gap-2">
          {ACCESSORY_PIECE_KEYS.map((piece) => {
            const bounds = accessoryUpgradeBounds(accessoryPieceSource(data, entry, piece));

            return (
              <PieceUpgradeRow
                key={piece}
                label={PIECE_LABELS[piece]}
                control={
                  <>
                    {showSources && sourceSelect(piece)}
                    {variantControl(piece)}
                  </>
                }
                upgrade={entry.upgrades[piece]}
                min={bounds.min}
                max={bounds.max}
                abilities={pieceAbilities(piece)}
                onUpgrade={(upgrade) => {
                  update((draft) => {
                    draft.upgrades[piece] = upgrade;
                  });
                }}
              />
            );
          })}
        </div>
      </SubCard>
    </EntryEditorShell>
  );
}
