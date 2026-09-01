import { getItem } from '@/data';
import { formatAbility, shortStatLabel, type PetEntry } from '@/domain/build';
import { resolvePetEntry } from '@/domain/engine';
import { PET_TIERS, petTierBreakdown, reachablePetTotals } from '@/domain/rules';
import { SubCard } from '@/components/Card';
import { ItemIcon } from '@/components/ItemIcon';
import { Select, type SelectOption } from '@/components/Select';
import { Hint } from '@/components/Text';
import { Tile, TileGroup } from '@/components/Tile';
import { cx } from '@/lib/cx';
import { useActions, useGameData } from '@/state';

import { EntryEditorShell } from '../EntryEditorShell';
import { orderedPets, petDefFor } from '../petOrder';

const TIER_BADGE_SIZE = 24;
const LEVEL_ICON_SIZE = 26;

function tierBadgeUrl(tier: string): string {
  return `${import.meta.env.BASE_URL}pets/${tier}.png`;
}

function levelIconUrl(level: number): string {
  return `${import.meta.env.BASE_URL}pets/levels/${level}.png`;
}

/** Raised pet editor (plan A2.6): stat tiles, reachable-total select and the derived tier breakdown. */
export function PetEditor({ entry }: { entry: PetEntry }) {
  const data = useGameData();
  const actions = useActions();
  const def = petDefFor(data, entry.petItemId);
  const totals = def === undefined ? [] : reachablePetTotals(def);
  const max = totals[0] ?? 0;
  const breakdown = def === undefined ? undefined : petTierBreakdown(def, entry.total);
  const resolution = resolvePetEntry(data, entry);

  const update = (recipe: (draft: PetEntry) => void): void => {
    actions.updateEntry('pets', entry.id, recipe);
  };

  const totalOptions: SelectOption[] = totals.map((total) => ({
    value: String(total),
    label: def === undefined ? String(total) : formatAbility(data, def.parameter, total, def.rate),
  }));

  if (!totals.includes(entry.total)) {
    totalOptions.unshift({ value: String(entry.total), label: `${entry.total} (unreachable)` });
  }

  return (
    <EntryEditorShell list="pets" entry={entry} contributions={resolution.contributions}>
      <SubCard label="Pet stat" span>
        <TileGroup label="Pet stat" columns={9}>
          {orderedPets(data).map((pet) => {
            const cage = getItem(data, pet.petItemId);

            return (
              <Tile
                key={pet.petItemId}
                selected={pet.petItemId === entry.petItemId}
                title={pet.name}
                icon={cage === undefined ? undefined : <ItemIcon icon={cage.icon} size={28} />}
                label={shortStatLabel(data, pet.parameter)}
                onSelect={() => {
                  update((draft) => {
                    draft.petItemId = pet.petItemId;
                    draft.total = reachablePetTotals(pet)[0] ?? 0;
                  });
                }}
              />
            );
          })}
        </TileGroup>
      </SubCard>
      <SubCard label="Total value">
        <Select
          label="Pet total"
          value={String(entry.total)}
          options={totalOptions}
          disabled={def === undefined}
          valueClassName="font-mono text-[14px] font-semibold text-accent"
          onChange={(value) => {
            update((draft) => {
              draft.total = Number(value);
            });
          }}
        />
        <Hint className="mt-2">Every reachable total, sorted descending — max {max}</Hint>
      </SubCard>
      <SubCard label="Tier breakdown" note="one raise per tier">
        <div className="flex items-center justify-center">
          {PET_TIERS.map((tier, index) => {
            const level = breakdown?.[index];

            return (
              <div
                key={tier}
                className={cx(
                  'flex w-10 flex-col items-center gap-1',
                  level === undefined && 'opacity-35',
                )}
                title={
                  level === undefined ? `Tier ${tier}: not raised` : `Tier ${tier}: level ${level}`
                }
              >
                <img
                  src={tierBadgeUrl(tier)}
                  alt={`Tier ${tier}`}
                  width={TIER_BADGE_SIZE}
                  height={TIER_BADGE_SIZE}
                  className="[image-rendering:pixelated]"
                />
                {level === undefined ? (
                  <span className="font-mono text-[11px] text-text-2">—</span>
                ) : (
                  <img
                    src={levelIconUrl(level)}
                    alt={`Level ${level}`}
                    width={LEVEL_ICON_SIZE}
                    height={LEVEL_ICON_SIZE}
                    className="[image-rendering:pixelated]"
                  />
                )}
              </div>
            );
          })}
        </div>
        <Hint className="mt-2">auto-derived from the total</Hint>
      </SubCard>
    </EntryEditorShell>
  );
}
