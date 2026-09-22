import { useState, type ReactNode } from 'react';

import type { SlimItem } from '@/data';
import { LIMITS } from '@/domain/build';
import { MAX_PREMIUM_FAVORITES } from '@/persistence';
import { Card, CardTitle } from '@/components/Card';
import { EntityCombobox } from '@/components/EntityCombobox';
import { ItemIcon } from '@/components/ItemIcon';
import { Hint } from '@/components/Text';
import { Toggle } from '@/components/Toggle';
import { Tooltip } from '@/components/Tooltip';
import { cx } from '@/lib/cx';
import { useActions, useAppStore, useGameData } from '@/state';

import { powerupSearchText, premiumItemEffect, splitEffectText } from './effectText';
import { knownItems, useFavoritePremiumItems } from './premiumFavorites';

function PremiumItemTile({
  item,
  effect,
  active,
  disabled = false,
  action,
  onRowClick,
}: {
  item: SlimItem;
  effect: string;
  active: boolean;
  disabled?: boolean | undefined;
  /** Right-side controls: a Toggle for favorites, add-favorite/remove buttons otherwise. */
  action: ReactNode;
  onRowClick?: (() => void) | undefined;
}) {
  return (
    <Tooltip
      className="min-w-0"
      content={
        <>
          <div className="font-semibold text-text">{item.name}</div>
          <ul className="mt-0.5 flex flex-col gap-0.5 font-mono text-[11px]">
            {splitEffectText(effect).map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </>
      }
    >
      <div
        className={cx(
          'flex w-full min-w-0 items-center gap-2 rounded-control bg-sub px-2.5 py-1.5 transition-colors select-none',
          disabled && 'opacity-50',
          !disabled && onRowClick !== undefined && 'cursor-pointer hover:bg-control',
        )}
        onClick={() => {
          if (!disabled) {
            onRowClick?.();
          }
        }}
      >
        <ItemIcon icon={item.icon} size={22} />
        <div className="min-w-0 flex-1">
          <div className={cx('truncate text-[11.5px]', active ? 'text-text' : 'text-text-2')}>
            {item.name}
          </div>
          <div className={cx('truncate font-mono text-[10px]', active ? 'text-muted' : 'text-dim')}>
            {effect}
          </div>
        </div>
        <span
          className="inline-flex items-center"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          {action}
        </span>
      </div>
    </Tooltip>
  );
}

/** Name on top, stats wrapped below — like the card/jewel pickers, so long stat lists never squeeze the name out. */
function PowerupOption({ item, effect }: { item: SlimItem; effect: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <ItemIcon icon={item.icon} size={22} />
      <div className="min-w-0 flex-1">
        <div className="truncate">{item.name}</div>
        <div className="font-mono text-[10.5px] break-words text-muted">{effect}</div>
      </div>
    </div>
  );
}

/** ☆ on an active item that is not a favorite: click to keep it as a quick toggle. */
function AddFavoriteButton({
  itemName,
  disabled = false,
  onClick,
}: {
  itemName: string;
  disabled?: boolean | undefined;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Add ${itemName} to favorites`}
      disabled={disabled}
      onClick={onClick}
      className="px-1 text-[13px] leading-none text-dim transition-colors hover:text-favorite disabled:cursor-not-allowed disabled:opacity-40"
    >
      ☆
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="px-1 text-[13px] text-dim transition-colors hover:text-danger"
    >
      ✕
    </button>
  );
}

/**
 * Premium consumables (plan A3.1): the user's favorites as quick toggles plus a search over every
 * stat-granting consumable. Favorites are a personal shortlist saved in this browser (seeded with
 * the curated list on first run) and edited with the ★ button; an active item that is not a
 * favorite — added by search or imported with a build — renders below with a remove button.
 * No stacking or exclusivity rules are applied.
 */
export function PremiumItemsCard() {
  const data = useGameData();
  const activeIds = useAppStore((state) => state.build.buffs.premiumItemIds);
  const favoriteIds = useAppStore((state) => state.preferences.premiumFavorites);
  const actions = useActions();
  const [editing, setEditing] = useState(false);
  const favorites = useFavoritePremiumItems();
  const favoriteSet = new Set(favoriteIds);
  const active = new Set(activeIds);
  const atLimit = activeIds.length >= LIMITS.premiumItems;
  const favoritesFull = favoriteIds.length >= MAX_PREMIUM_FAVORITES;
  const extras = knownItems(
    data,
    activeIds.filter((id) => !favoriteSet.has(id)),
  );

  const toggle = (id: number): void => {
    actions.toggleIdInList('premiumItemIds', id);
  };

  const pick = (item: SlimItem | null): void => {
    if (item === null) {
      return;
    }

    if (editing && !favoriteSet.has(item.id)) {
      actions.togglePremiumFavorite(item.id);
    } else if (!editing && !active.has(item.id)) {
      toggle(item.id);
    }
  };

  const favoriteTile = (item: SlimItem): ReactNode => {
    const isActive = active.has(item.id);
    const blocked = atLimit && !isActive;
    let tile;

    if (editing) {
      tile = (
        <PremiumItemTile
          key={item.id}
          item={item}
          effect={premiumItemEffect(data, item)}
          active
          action={
            <RemoveButton
              label={`Remove ${item.name} from favorites`}
              onClick={() => {
                actions.togglePremiumFavorite(item.id);
              }}
            />
          }
        />
      );
    } else {
      tile = (
        <PremiumItemTile
          key={item.id}
          item={item}
          effect={premiumItemEffect(data, item)}
          active={isActive}
          disabled={blocked}
          action={
            <Toggle
              label={item.name}
              checked={isActive}
              disabled={blocked}
              onChange={() => {
                toggle(item.id);
              }}
            />
          }
          onRowClick={() => {
            toggle(item.id);
          }}
        />
      );
    }

    return tile;
  };

  return (
    <Card>
      <CardTitle
        right={
          <>
            <span className="font-mono text-[11px] text-muted">{activeIds.length} active</span>
            <button
              type="button"
              aria-pressed={editing}
              aria-label="Edit favorites"
              title={editing ? 'Done editing favorites' : 'Edit favorites'}
              onClick={() => {
                setEditing((value) => !value);
              }}
              className={cx(
                'ml-1 flex items-center gap-1 rounded-control px-1.5 py-0.5 text-[11px] font-medium transition-colors',
                editing
                  ? 'bg-favorite/15 text-favorite'
                  : 'text-favorite/80 hover:bg-control hover:text-favorite',
              )}
            >
              <span aria-hidden="true" className="text-[13px] leading-none">
                ★
              </span>
              {editing && <span>done</span>}
            </button>
          </>
        }
      >
        Premium items
      </CardTitle>
      {editing && (
        <Hint className="mb-2">
          Your quick toggles, saved in this browser only — builds and share codes are unaffected.
        </Hint>
      )}
      {favorites.length > 0 ? (
        <div className="grid grid-cols-2 gap-1.5">{favorites.map(favoriteTile)}</div>
      ) : (
        <Hint>No favorites — click ★ to pick the items you use often.</Hint>
      )}
      <EntityCombobox
        className="mt-3"
        options={data.powerups}
        value={null}
        onChange={pick}
        getKey={(item) => item.id}
        getLabel={(item) => item.name}
        getSearchText={(item) => powerupSearchText(data, item)}
        minQueryLength={1}
        renderOption={(item) => (
          <PowerupOption item={item} effect={premiumItemEffect(data, item)} />
        )}
        leading={
          <span aria-hidden="true" className="text-[13px] text-dim">
            {editing ? '★' : '🔍'}
          </span>
        }
        placeholder={
          editing
            ? `Add favorite… ${data.powerups.length} consumables`
            : `Add item… ${data.powerups.length} consumables`
        }
        label={editing ? 'Add premium favorite' : 'Add premium item'}
        disabled={editing ? favoritesFull : atLimit}
      />
      {!editing && atLimit && (
        <Hint tone="warn" className="mt-1.5">
          Limit of {LIMITS.premiumItems} active items reached — remove one to add another.
        </Hint>
      )}
      {editing && favoritesFull && (
        <Hint tone="warn" className="mt-1.5">
          Limit of {MAX_PREMIUM_FAVORITES} favorites reached — remove one to add another.
        </Hint>
      )}
      {!editing && extras.length > 0 && (
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {extras.map((item) => (
            <PremiumItemTile
              key={item.id}
              item={item}
              effect={premiumItemEffect(data, item)}
              active
              action={
                <>
                  <AddFavoriteButton
                    itemName={item.name}
                    disabled={favoritesFull}
                    onClick={() => {
                      actions.togglePremiumFavorite(item.id);
                    }}
                  />
                  <RemoveButton
                    label={`Remove ${item.name}`}
                    onClick={() => {
                      toggle(item.id);
                    }}
                  />
                </>
              }
            />
          ))}
        </div>
      )}
      {editing ? (
        <div className="mt-2.5 flex items-center gap-2">
          <Hint>Search to add; ✕ on a tile removes it.</Hint>
          <button
            type="button"
            onClick={() => {
              actions.openDialog({
                kind: 'confirm',
                title: 'Reset favorites?',
                message: 'Your favorites are replaced by the default quick toggles.',
                confirmLabel: 'Reset',
                danger: false,
                onConfirm: () => {
                  actions.resetPremiumFavorites();
                },
              });
            }}
            className="ml-auto shrink-0 text-[11px] font-medium text-accent hover:underline"
          >
            reset to defaults
          </button>
        </div>
      ) : (
        <Hint className="mt-2.5">
          Search by name or stat. No stacking or exclusivity rules are applied.
        </Hint>
      )}
    </Card>
  );
}
