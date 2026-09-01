import { useState } from 'react';

import type { GameData, HousingNpc } from '@/data';
import { Card, CardTitle } from '@/components/Card';
import { Hint } from '@/components/Text';
import { Toggle } from '@/components/Toggle';
import { cx } from '@/lib/cx';
import { useActions, useAppStore, useGameData } from '@/state';

import { effectTextOrNone } from './effectText';

type NpcListKey = 'personalNpcIds' | 'coupleNpcIds' | 'guildNpcIds';

interface NpcGroupDef {
  readonly key: NpcListKey;
  readonly label: string;
  readonly npcsOf: (data: GameData) => readonly HousingNpc[];
}

/** Personal and couple houses share one NPC roster; the guild ship has its own (plan A3.1). */
const GROUPS: readonly NpcGroupDef[] = [
  { key: 'personalNpcIds', label: 'Personal house', npcsOf: (data) => data.personalNpcs },
  { key: 'coupleNpcIds', label: 'Couple house', npcsOf: (data) => data.personalNpcs },
  { key: 'guildNpcIds', label: 'Guild ship', npcsOf: (data) => data.guildNpcs },
];

function NpcRow({
  npc,
  groupLabel,
  active,
  editing,
  onToggle,
}: {
  npc: HousingNpc;
  groupLabel: string;
  active: boolean;
  /** Roster rows toggle on click; collapsed active rows only offer the remove button. */
  editing: boolean;
  onToggle: () => void;
}) {
  const data = useGameData();
  const effect = effectTextOrNone(data, npc.abilities);
  const effectText = (
    <span className="min-w-0 max-w-[60%] truncate font-mono text-[11px] text-muted" title={effect}>
      {effect}
    </span>
  );
  let row;

  if (editing) {
    row = (
      <div
        className="flex cursor-pointer items-center gap-2 rounded-control bg-sub px-2.5 py-1.5 transition-colors select-none hover:bg-control"
        onClick={onToggle}
      >
        <span
          className="inline-flex"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Toggle label={`${groupLabel}: ${npc.shortName}`} checked={active} onChange={onToggle} />
        </span>
        <span
          className={cx(
            'min-w-0 flex-1 truncate text-[11.5px]',
            active ? 'text-text' : 'text-text-2',
          )}
        >
          {npc.shortName}
        </span>
        {effectText}
      </div>
    );
  } else {
    row = (
      <div className="flex items-center gap-2 rounded-control bg-sub px-2.5 py-1.5 select-none">
        <span className="min-w-0 flex-1 truncate text-[11.5px] text-text">{npc.shortName}</span>
        {effectText}
        <button
          type="button"
          aria-label={`Remove ${groupLabel}: ${npc.shortName}`}
          onClick={onToggle}
          className="shrink-0 px-1 text-[13px] text-dim transition-colors hover:text-danger"
        >
          ✕
        </button>
      </div>
    );
  }

  return row;
}

/** One house: collapsed to its active NPCs, expanded to the full roster while editing. */
function NpcGroup({
  group,
  activeIds,
  onToggle,
}: {
  group: NpcGroupDef;
  activeIds: readonly number[];
  onToggle: (id: number) => void;
}) {
  const data = useGameData();
  const [editing, setEditing] = useState(false);
  const npcs = group.npcsOf(data);
  const active = new Set(activeIds);
  const shown = editing ? npcs : npcs.filter((npc) => active.has(npc.id));
  let rows;

  if (shown.length === 0) {
    rows = <Hint>none active — edit to add</Hint>;
  } else {
    rows = (
      <div className="flex flex-col gap-1">
        {shown.map((npc) => (
          <NpcRow
            key={npc.id}
            npc={npc}
            groupLabel={group.label}
            active={active.has(npc.id)}
            editing={editing}
            onToggle={() => {
              onToggle(npc.id);
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <section aria-label={group.label}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[10.5px] font-semibold tracking-[0.06em] text-muted uppercase">
          {group.label}
        </span>
        <span className="font-mono text-[11px] text-muted">
          {activeIds.length} / {npcs.length}
        </span>
        <button
          type="button"
          aria-expanded={editing}
          onClick={() => {
            setEditing((value) => !value);
          }}
          className="ml-auto text-[11px] font-medium text-accent hover:underline"
        >
          {editing ? 'done ▴' : 'edit ▾'}
        </button>
      </div>
      {rows}
    </section>
  );
}

/** Housing NPC buffs (plan A3.1): personal house, couple house and guild ship. */
export function HousingNpcsCard() {
  const buffs = useAppStore((state) => state.build.buffs);
  const actions = useActions();
  const totalActive = GROUPS.reduce((total, group) => total + buffs[group.key].length, 0);

  return (
    <Card>
      <CardTitle
        right={<span className="font-mono text-[11px] text-muted">{totalActive} active</span>}
      >
        Housing NPCs
      </CardTitle>
      <div className="flex flex-col gap-3">
        {GROUPS.map((group) => (
          <NpcGroup
            key={group.key}
            group={group}
            activeIds={buffs[group.key]}
            onToggle={(id) => {
              actions.toggleIdInList(group.key, id);
            }}
          />
        ))}
      </div>
    </Card>
  );
}
