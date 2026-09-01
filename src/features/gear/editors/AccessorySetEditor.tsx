import {
  getItem,
  type AccessorySet,
  type EarringVariant,
  type NecklaceVariant,
  type SlimItem,
} from '@/data';
import { accessorySetShortName, type AccessorySetEntry } from '@/domain/build';
import { resolveAccessorySetEntry } from '@/domain/engine';
import { SubCard } from '@/components/Card';
import { EntityCombobox } from '@/components/EntityCombobox';
import { ItemIcon } from '@/components/ItemIcon';
import { SegmentedControl, type SegmentOption } from '@/components/SegmentedControl';
import { Hint } from '@/components/Text';
import { useActions, useGameData } from '@/state';

import { EntryEditorShell } from '../EntryEditorShell';
import {
  formatAbilityList,
  formatSetBonusByTier,
  ringSignature,
  accessoryAbilitiesAt,
} from '../format';
import { PieceUpgradeRow } from './PieceUpgradeRow';

const EARRING_OPTIONS: readonly SegmentOption<EarringVariant>[] = [
  { value: 'plug', label: 'Plug' },
  { value: 'demol', label: 'Demol' },
];

/** A set without a Peision necklace (Adept's, Marksman's) doesn't offer the option at all. */
function necklaceOptions(set: AccessorySet | null): SegmentOption<NecklaceVariant>[] {
  const options: SegmentOption<NecklaceVariant>[] = [
    { value: 'gore', label: 'Gore' },
    { value: 'mental', label: 'Mental' },
  ];

  if (set === null || set.necklaces.peision !== undefined) {
    options.push({ value: 'peision', label: 'Peision' });
  }

  return options;
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
 * wear order — Ring 1, Earring 1, Necklace, Earring 2, Ring 2 — each with its own upgrade.
 */
export function AccessorySetEditor({ entry }: { entry: AccessorySetEntry }) {
  const data = useGameData();
  const actions = useActions();
  const set = data.accessorySets.find((candidate) => candidate.id === entry.setId) ?? null;
  const ring = set === null ? undefined : getItem(data, set.ring);
  const resolution = resolveAccessorySetEntry(data, entry);

  const update = (recipe: (draft: AccessorySetEntry) => void): void => {
    actions.updateEntry('accessorySets', entry.id, recipe);
  };

  const pieceAbilities = (itemId: number | undefined, upgrade: number): string => {
    const item: SlimItem | undefined = itemId === undefined ? undefined : getItem(data, itemId);

    return item === undefined ? '—' : formatAbilityList(data, accessoryAbilitiesAt(item, upgrade));
  };

  const searchText = (candidate: AccessorySet): string =>
    `${candidate.name} ${ringSignature(data, getItem(data, candidate.ring))}`;

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
          label="Accessory set"
          onChange={(next) => {
            update((draft) => {
              draft.setId = next === null ? null : next.id;

              if (
                next !== null &&
                next.necklaces.peision === undefined &&
                draft.necklace === 'peision'
              ) {
                draft.necklace = 'gore';
              }
            });
          }}
        />
        <Hint className="mt-1.5">
          {set === null ? 'Pick a set to see its bonuses' : formatSetBonusByTier(data, set.bonus)}
        </Hint>
      </SubCard>
      <SubCard label="Pieces" span>
        <div className="flex flex-col gap-2">
          <PieceUpgradeRow
            label="Ring 1"
            upgrade={entry.upgrades.ring1}
            abilities={pieceAbilities(set?.ring, entry.upgrades.ring1)}
            onUpgrade={(upgrade) => {
              update((draft) => {
                draft.upgrades.ring1 = upgrade;
              });
            }}
          />
          <PieceUpgradeRow
            label="Earring 1"
            control={
              <SegmentedControl
                label="Earring 1 type"
                options={EARRING_OPTIONS}
                value={entry.earring1}
                onChange={(variant) => {
                  update((draft) => {
                    draft.earring1 = variant;
                  });
                }}
              />
            }
            upgrade={entry.upgrades.earring1}
            abilities={pieceAbilities(set?.earrings[entry.earring1], entry.upgrades.earring1)}
            onUpgrade={(upgrade) => {
              update((draft) => {
                draft.upgrades.earring1 = upgrade;
              });
            }}
          />
          <PieceUpgradeRow
            label="Necklace"
            control={
              <SegmentedControl
                label="Necklace type"
                options={necklaceOptions(set)}
                value={entry.necklace}
                onChange={(variant) => {
                  update((draft) => {
                    draft.necklace = variant;
                  });
                }}
              />
            }
            upgrade={entry.upgrades.necklace}
            abilities={pieceAbilities(set?.necklaces[entry.necklace], entry.upgrades.necklace)}
            onUpgrade={(upgrade) => {
              update((draft) => {
                draft.upgrades.necklace = upgrade;
              });
            }}
          />
          <PieceUpgradeRow
            label="Earring 2"
            control={
              <SegmentedControl
                label="Earring 2 type"
                options={EARRING_OPTIONS}
                value={entry.earring2}
                onChange={(variant) => {
                  update((draft) => {
                    draft.earring2 = variant;
                  });
                }}
              />
            }
            upgrade={entry.upgrades.earring2}
            abilities={pieceAbilities(set?.earrings[entry.earring2], entry.upgrades.earring2)}
            onUpgrade={(upgrade) => {
              update((draft) => {
                draft.upgrades.earring2 = upgrade;
              });
            }}
          />
          <PieceUpgradeRow
            label="Ring 2"
            upgrade={entry.upgrades.ring2}
            abilities={pieceAbilities(set?.ring, entry.upgrades.ring2)}
            onUpgrade={(upgrade) => {
              update((draft) => {
                draft.upgrades.ring2 = upgrade;
              });
            }}
          />
        </div>
      </SubCard>
    </EntryEditorShell>
  );
}
