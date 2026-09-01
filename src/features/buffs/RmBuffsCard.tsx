import { useMemo } from 'react';

import { RM_BUFF_SKILL_IDS, requireSkill, type GameData } from '@/data';
import { Card, CardTitle } from '@/components/Card';
import { SkillIcon } from '@/components/ItemIcon';
import { Toggle } from '@/components/Toggle';
import { Tooltip } from '@/components/Tooltip';
import { cx } from '@/lib/cx';
import { useActions, useAppStore, useGameData } from '@/state';

import { rmBuffEffect } from './effectText';

interface RmBuffRowModel {
  readonly skillId: number;
  readonly name: string;
  readonly icon: string;
  readonly effect: string;
}

function rmBuffRows(data: GameData): RmBuffRowModel[] {
  return RM_BUFF_SKILL_IDS.map((skillId) => {
    const skill = requireSkill(data, skillId);

    return {
      skillId,
      name: skill.name,
      icon: skill.icon,
      effect: rmBuffEffect(data, skill),
    };
  });
}

function RmBuffRow({
  row,
  active,
  enabled,
  onToggle,
}: {
  row: RmBuffRowModel;
  active: boolean;
  /** The master switch; rows are inert while it is off. */
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <Tooltip content={row.effect} className="w-full">
      <div
        className={cx(
          'flex w-full items-center gap-2 rounded-control bg-sub px-2.5 py-1.5 transition-colors select-none',
          enabled ? 'cursor-pointer hover:bg-control' : 'opacity-50',
        )}
        onClick={() => {
          if (enabled) {
            onToggle();
          }
        }}
      >
        <span
          className="inline-flex"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Toggle label={row.name} checked={active} disabled={!enabled} onChange={onToggle} />
        </span>
        <SkillIcon icon={row.icon} size={22} className={active ? undefined : 'opacity-50'} />
        <span
          className={cx(
            'min-w-0 flex-1 truncate text-left text-[11.5px]',
            active ? 'text-text' : 'text-muted',
          )}
        >
          {row.name}
        </span>
      </div>
    </Tooltip>
  );
}

/**
 * RM buffs at max level (plan A3.1): a master switch plus one row per buff. Rows toggle on click
 * anywhere; the stats appear in a hover tooltip instead of inline text.
 */
export function RmBuffsCard() {
  const data = useGameData();
  const rmBuffs = useAppStore((state) => state.build.buffs.rmBuffs);
  const actions = useActions();
  const rows = useMemo(() => rmBuffRows(data), [data]);
  const excluded = new Set(rmBuffs.excludedSkillIds);

  return (
    <Card>
      <CardTitle
        right={
          <>
            <span className="text-[11.5px] text-text-2">Max RM buffs</span>
            <Toggle
              size="lg"
              label="Max RM buffs"
              checked={rmBuffs.enabled}
              onChange={(enabled) => {
                actions.updateBuffs((buffs) => {
                  buffs.rmBuffs.enabled = enabled;
                });
              }}
            />
          </>
        }
      >
        RM buffs
      </CardTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {rows.map((row) => (
          <RmBuffRow
            key={row.skillId}
            row={row}
            active={rmBuffs.enabled && !excluded.has(row.skillId)}
            enabled={rmBuffs.enabled}
            onToggle={() => {
              actions.toggleRmBuff(row.skillId);
            }}
          />
        ))}
      </div>
    </Card>
  );
}
