import { useMemo, type ReactNode } from 'react';

import { getItem, requireItem, type SlimItem } from '@/data';
import { CURATED_POWERUP_IDS } from '@/config/curatedPowerups';
import { LIMITS } from '@/domain/build';
import { Card, CardTitle } from '@/components/Card';
import { EntityCombobox } from '@/components/EntityCombobox';
import { ItemIcon } from '@/components/ItemIcon';
import { Hint } from '@/components/Text';
import { Toggle } from '@/components/Toggle';
import { Tooltip } from '@/components/Tooltip';
import { cx } from '@/lib/cx';
import { useActions, useAppStore, useGameData } from '@/state';

import { powerupSearchText, premiumItemEffect } from './effectText';

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
  /** Right-side control: a Toggle for curated tiles, a remove button for added ones. */
  action: ReactNode;
  onRowClick?: (() => void) | undefined;
}) {
  return (
    <Tooltip
      className="min-w-0"
      content={
        <>
          <div className="font-semibold text-text">{item.name}</div>
          <div className="mt-0.5 font-mono text-[11px]">{effect}</div>
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
          className="inline-flex"
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

function PowerupOption({ item, effect }: { item: SlimItem; effect: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <ItemIcon icon={item.icon} size={22} />
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      <span className="shrink-0 font-mono text-[11px] text-muted">{effect}</span>
    </div>
  );
}

/**
 * Premium consumables (plan A3.1): curated quick toggles plus a search over every stat-granting
 * consumable. Added items render like curated tiles with a remove button instead of a switch.
 * No stacking or exclusivity rules are applied in v1.
 */
export function PremiumItemsCard() {
  const data = useGameData();
  const activeIds = useAppStore((state) => state.build.buffs.premiumItemIds);
  const actions = useActions();
  const curated = useMemo(() => CURATED_POWERUP_IDS.map((id) => requireItem(data, id)), [data]);
  const active = new Set(activeIds);
  const atLimit = activeIds.length >= LIMITS.premiumItems;
  const extras = activeIds
    .filter((id) => !CURATED_POWERUP_IDS.includes(id))
    .map((id) => getItem(data, id))
    .filter((item): item is SlimItem => item !== undefined);

  const toggle = (id: number): void => {
    actions.toggleIdInList('premiumItemIds', id);
  };

  const add = (item: SlimItem | null): void => {
    if (item !== null && !active.has(item.id)) {
      toggle(item.id);
    }
  };

  return (
    <Card>
      <CardTitle
        right={<span className="font-mono text-[11px] text-muted">{activeIds.length} active</span>}
      >
        Premium items
      </CardTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {curated.map((item) => (
          <PremiumItemTile
            key={item.id}
            item={item}
            effect={premiumItemEffect(data, item)}
            active={active.has(item.id)}
            disabled={atLimit && !active.has(item.id)}
            action={
              <Toggle
                label={item.name}
                checked={active.has(item.id)}
                disabled={atLimit && !active.has(item.id)}
                onChange={() => {
                  toggle(item.id);
                }}
              />
            }
            onRowClick={() => {
              toggle(item.id);
            }}
          />
        ))}
      </div>
      <EntityCombobox
        className="mt-3"
        options={data.powerups}
        value={null}
        onChange={add}
        getKey={(item) => item.id}
        getLabel={(item) => item.name}
        getSearchText={(item) => powerupSearchText(data, item)}
        minQueryLength={1}
        renderOption={(item) => (
          <PowerupOption item={item} effect={premiumItemEffect(data, item)} />
        )}
        leading={
          <span aria-hidden="true" className="text-[13px] text-dim">
            🔍
          </span>
        }
        placeholder={`Add item… ${data.powerups.length} consumables`}
        label="Add premium item"
        disabled={atLimit}
      />
      {atLimit && (
        <Hint tone="warn" className="mt-1.5">
          Limit of {LIMITS.premiumItems} active items reached — remove one to add another.
        </Hint>
      )}
      {extras.length > 0 && (
        <div className="mt-2.5 grid grid-cols-2 gap-1.5">
          {extras.map((item) => (
            <PremiumItemTile
              key={item.id}
              item={item}
              effect={premiumItemEffect(data, item)}
              active
              action={
                <button
                  type="button"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => {
                    toggle(item.id);
                  }}
                  className="px-1 text-[13px] text-dim transition-colors hover:text-danger"
                >
                  ✕
                </button>
              }
            />
          ))}
        </div>
      )}
      <Hint className="mt-2.5">
        Search by name or stat. No stacking or exclusivity rules are applied.
      </Hint>
    </Card>
  );
}
