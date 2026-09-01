import type { SlimItem } from '@/data';
import { ItemIcon } from '@/components/ItemIcon';
import { rarityClassName } from '@/components/rarity';
import { cx } from '@/lib/cx';

/** Picker option row (plan A5.3): icon, rarity-coloured name, meta tags and a one-line ability preview. */
export function ItemOptionRow({
  item,
  meta,
  abilities,
}: {
  item: SlimItem;
  meta: readonly string[];
  abilities: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <ItemIcon icon={item.icon} size={24} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cx('truncate font-semibold', rarityClassName(item.rarity))}>
            {item.name}
          </span>
          {meta.map((tag) => (
            <span key={tag} className="shrink-0 font-mono text-[11px] text-muted">
              {tag}
            </span>
          ))}
        </div>
        {abilities !== '' && (
          <div className="truncate font-mono text-[10.5px] text-dim">{abilities}</div>
        )}
      </div>
    </div>
  );
}
