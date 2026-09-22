import { ItemIcon } from '@/components/ItemIcon';
import { Toggle } from '@/components/Toggle';
import { ToolbarMenu, ToolbarMenuSection } from '@/components/ToolbarMenu';
import { cx } from '@/lib/cx';

import type { PremiumQuickToggle, PremiumQuickToggles } from './premiumQuickToggles';

function PremiumQuickToggleTile({
  toggle,
  onToggle,
}: {
  toggle: PremiumQuickToggle;
  onToggle: () => void;
}) {
  const { item, effect, active, disabled } = toggle;

  return (
    <div
      title={`${item.name} — ${effect}`}
      className={cx(
        'flex min-w-0 items-center gap-2 rounded-control px-2 py-1.5 transition-colors select-none',
        active ? 'bg-accent/10' : 'bg-control/60',
        disabled ? 'opacity-50' : 'cursor-pointer hover:bg-control',
      )}
      onClick={() => {
        if (!disabled) {
          onToggle();
        }
      }}
    >
      <ItemIcon icon={item.icon} size={22} className={active ? undefined : 'opacity-60'} />
      <div className="min-w-0 flex-1">
        <div className={cx('truncate text-[11px]', active ? 'text-text' : 'text-text-2')}>
          {item.name}
        </div>
        <div className={cx('truncate font-mono text-[9.5px]', active ? 'text-muted' : 'text-dim')}>
          {effect}
        </div>
      </div>
      <span
        className="inline-flex"
        onClick={(event) => {
          event.stopPropagation();
        }}
      >
        <Toggle label={item.name} checked={active} disabled={disabled} onChange={onToggle} />
      </span>
    </div>
  );
}

/**
 * The premium favorites as switches on the build's own premium items (not a what-if): the Buffs &
 * Swaps tab shows the same state. The badge counts every active item, favorite or not.
 */
export function PremsMenu({ premium }: { premium: PremiumQuickToggles }) {
  return (
    <ToolbarMenu
      label="Prems"
      count={premium.activeCount}
      panelClassName="w-[480px] max-w-[calc(100vw-24px)]"
    >
      <ToolbarMenuSection
        title="Premium items"
        note={
          <>
            {premium.activeCount} on · same as Buffs &amp; Swaps
            {premium.activeCount > 0 && (
              <>
                {' · '}
                <button
                  type="button"
                  onClick={premium.onClear}
                  className="font-medium text-accent hover:underline"
                >
                  Clear
                </button>
              </>
            )}
          </>
        }
      >
        {premium.toggles.length > 0 ? (
          <div className="grid max-h-[50vh] grid-cols-2 gap-1 overflow-y-auto">
            {premium.toggles.map((toggle) => (
              <PremiumQuickToggleTile
                key={toggle.item.id}
                toggle={toggle}
                onToggle={() => {
                  premium.onToggle(toggle.item.id);
                }}
              />
            ))}
          </div>
        ) : (
          <p className="text-[11px] text-dim">
            No favorites yet — pick them with ★ on the Buffs &amp; Swaps tab.
          </p>
        )}
      </ToolbarMenuSection>
    </ToolbarMenu>
  );
}
