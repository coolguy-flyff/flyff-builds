import { GEAR_LIST_KEYS, type GearListKey } from '@/domain/build';
import { CountBadge, WarningBadge } from '@/components/Chip';
import { cx } from '@/lib/cx';
import { useBuild, useSelectors } from '@/state';

import { plural } from './format';
import { GEAR_CATEGORIES } from './gearCategories';

/** Category pill row (plan D3): label, entry count and a warning badge per gear list. */
export function CategoryPills({
  active,
  onChange,
}: {
  active: GearListKey;
  onChange: (category: GearListKey) => void;
}) {
  const build = useBuild();
  const selectors = useSelectors();
  const issues = selectors.issues(build);

  return (
    <div role="tablist" aria-label="Gear categories" className="flex flex-wrap gap-1.5">
      {GEAR_LIST_KEYS.map((key) => {
        const isActive = key === active;
        const warnings = issues.filter((issue) => issue.target.list === key).length;

        return (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            className={cx(
              'inline-flex items-center gap-1.5 rounded-pill px-[13px] py-1.5 text-[12.5px] transition-colors',
              isActive
                ? 'bg-accent/14 font-semibold text-accent'
                : 'bg-white/5 font-medium text-text-2 hover:bg-white/8 hover:text-text',
            )}
            onClick={() => {
              onChange(key);
            }}
          >
            {GEAR_CATEGORIES[key].label}
            <CountBadge count={build[key].length} />
            {warnings > 0 && (
              <WarningBadge count={warnings} title={plural(warnings, 'validation issue')} />
            )}
          </button>
        );
      })}
    </div>
  );
}
