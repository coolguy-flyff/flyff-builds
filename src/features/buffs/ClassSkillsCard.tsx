import { Fragment, useMemo } from 'react';

import {
  classSkillsFor,
  requireClass,
  type ClassSkill,
  type ClassSkillKind,
  type GameData,
} from '@/data';
import { isClassSkillUnlocked } from '@/domain/rules';
import { Card, CardTitle } from '@/components/Card';
import { SkillIcon } from '@/components/ItemIcon';
import { Hint } from '@/components/Text';
import { Tooltip } from '@/components/Tooltip';
import { cx } from '@/lib/cx';
import { requireDefined } from '@/lib/assert';
import { useActions, useAppStore, useGameData } from '@/state';

import { maxedSkillEffect, splitEffectText } from './effectText';

interface SkillTileModel {
  readonly skill: ClassSkill;
  readonly className: string;
  readonly effect: string;
  /** "II", "III", … on a master variation; the base skill carries none. */
  readonly badge: string | null;
  readonly variation: boolean;
}

/** A skill family drawn as one chain: the base skill first, then its variations in data order. */
interface SkillChain {
  readonly tiles: readonly SkillTileModel[];
}

interface GroupDef {
  readonly label: string;
  readonly kinds: readonly ClassSkillKind[];
}

/** Buffs (on others or the caster only) first, then passives (plan feedback 2026-09-03, item 1). */
const GROUPS: readonly GroupDef[] = [
  { label: 'Class buffs', kinds: ['classBuff', 'selfBuff'] },
  { label: 'Passives', kinds: ['passive'] },
];

/** Every variation shares its base skill's icon, so a chain tells them apart by number. */
const VARIATION_BADGES: readonly string[] = ['II', 'III', 'IV', 'V'];

function isBase(skill: ClassSkill): boolean {
  return skill.id === skill.familyId;
}

function chainsFor(data: GameData, jobId: number, kinds: readonly ClassSkillKind[]): SkillChain[] {
  const families = new Map<number, ClassSkill[]>();

  for (const skill of classSkillsFor(data, jobId)) {
    if (kinds.includes(skill.kind)) {
      const members = families.get(skill.familyId) ?? [];

      members.push(skill);
      families.set(skill.familyId, members);
    }
  }

  return [...families.values()].map((members) => {
    // Stable sort: the base first, variations keep the skill list's order.
    const ordered = [...members].sort((a, b) => Number(isBase(b)) - Number(isBase(a)));

    return {
      tiles: ordered.map((skill, index) => ({
        skill,
        className: requireClass(data, skill.classId).name,
        effect: maxedSkillEffect(data, skill, 'classSkill'),
        badge: index === 0 ? null : (VARIATION_BADGES[index - 1] ?? String(index + 1)),
        variation: index > 0,
      })),
    };
  });
}

/** "Templar · Lv 166 · 20 s" — where the skill comes from and how long a cast lasts. */
function tileMeta(tile: SkillTileModel): string {
  const parts = [tile.className, `Lv ${tile.skill.level}`];

  if (!tile.skill.permanent && tile.skill.durationSeconds !== undefined) {
    parts.push(`${tile.skill.durationSeconds} s`);
  }

  return parts.join(' · ');
}

function TileTooltip({ tile, level }: { tile: SkillTileModel; level: number }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-semibold text-text">{tile.skill.name}</span>
      <span className="text-dim">{tileMeta(tile)}</span>
      {tile.variation && <span className="text-dim">Master variation</span>}
      {!isClassSkillUnlocked(tile.skill, level) && (
        <span className="text-warn">
          Requires Lv {tile.skill.level} — character is Lv {level}
        </span>
      )}
      {splitEffectText(tile.effect).map((line) => (
        <span key={line}>{line}</span>
      ))}
    </div>
  );
}

function LockMark() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 10 12"
      className="absolute -top-0.5 -right-0.5 h-3 w-2.5 fill-muted"
    >
      <path d="M5 0a3 3 0 0 0-3 3v2H1v7h8V5H8V3a3 3 0 0 0-3-3zm0 1.5A1.5 1.5 0 0 1 6.5 3v2h-3V3A1.5 1.5 0 0 1 5 1.5z" />
    </svg>
  );
}

/**
 * One skill as an icon: lit while active, dimmed otherwise, locked (and inert) below its required
 * level; its name and stats live in the tooltip.
 */
function SkillTile({
  tile,
  level,
  lit,
  onToggle,
}: {
  tile: SkillTileModel;
  level: number;
  lit: boolean;
  onToggle: () => void;
}) {
  const locked = !isClassSkillUnlocked(tile.skill, level);

  return (
    <Tooltip content={<TileTooltip tile={tile} level={level} />}>
      <button
        type="button"
        aria-pressed={lit}
        aria-label={tile.skill.name}
        disabled={locked}
        onClick={onToggle}
        className={cx(
          'relative flex h-9 w-9 items-center justify-center rounded-control transition-colors focus-visible:outline-2 focus-visible:outline-accent',
          lit && 'bg-accent/12 outline-1 outline-accent/40',
          !lit && !locked && 'bg-sub hover:bg-control',
          locked && 'cursor-not-allowed bg-sub/60',
        )}
      >
        <SkillIcon
          icon={tile.skill.icon}
          size={28}
          className={cx(!lit && 'grayscale', locked ? 'opacity-20' : !lit && 'opacity-35')}
        />
        {tile.badge !== null && (
          <span
            aria-hidden="true"
            className={cx(
              'absolute -right-0.5 -bottom-0.5 rounded-[4px] border border-white/15 bg-backdrop px-[3px] font-mono text-[8px] leading-[12px] font-semibold',
              lit ? 'text-accent' : 'text-muted',
            )}
          >
            {tile.badge}
          </span>
        )}
        {locked && <LockMark />}
      </button>
    </Tooltip>
  );
}

/**
 * A family as linked slots: the base skill, then each variation joined by a short link. The links
 * up to the active variation light up, so the chain reads as "this one replaces the base".
 */
function SkillChainView({
  chain,
  level,
  litIds,
}: {
  chain: SkillChain;
  level: number;
  litIds: ReadonlySet<number>;
}) {
  const actions = useActions();
  const base = requireDefined(chain.tiles[0], 'empty chain');
  const litIndex = chain.tiles.findIndex((tile) => litIds.has(tile.skill.id));
  const tiles = chain.tiles.map((tile, index) => (
    <Fragment key={tile.skill.id}>
      {index > 0 && (
        <span
          aria-hidden="true"
          className={cx(
            'h-0.5 w-2 shrink-0 rounded-full',
            litIndex >= index ? 'bg-accent/70' : 'bg-white/15',
          )}
        />
      )}
      <SkillTile
        tile={tile}
        level={level}
        lit={litIds.has(tile.skill.id)}
        onToggle={() => {
          actions.toggleClassSkill(tile.skill.id);
        }}
      />
    </Fragment>
  ));
  let view = <>{tiles}</>;

  if (chain.tiles.length > 1) {
    view = (
      <span
        role="group"
        aria-label={`${base.skill.name} variations`}
        className="inline-flex items-center rounded-control bg-white/4 p-0.5 outline-1 outline-white/8"
      >
        {tiles}
      </span>
    );
  }

  return view;
}

function ClassSkillGroup({
  group,
  chains,
  level,
  litIds,
}: {
  group: GroupDef;
  chains: readonly SkillChain[];
  level: number;
  litIds: ReadonlySet<number>;
}) {
  const actions = useActions();
  const skills = chains.flatMap((chain) => chain.tiles.map((tile) => tile.skill));
  const ids = skills.map((skill) => skill.id);
  const unlockedIds = skills
    .filter((skill) => isClassSkillUnlocked(skill, level))
    .map((skill) => skill.id);
  const activeCount = ids.filter((id) => litIds.has(id)).length;

  return (
    <section aria-label={group.label}>
      <div className="mb-1.5 flex items-center gap-2">
        <span className="text-[10.5px] font-semibold tracking-[0.06em] text-muted uppercase">
          {group.label}
        </span>
        <span className="font-mono text-[11px] text-muted">
          {activeCount} / {chains.length}
        </span>
        <span className="ml-auto flex items-center gap-2 text-[11px] font-medium">
          <button
            type="button"
            aria-label={`All ${group.label.toLowerCase()} on`}
            className="text-accent hover:underline"
            onClick={() => {
              actions.setClassSkills(unlockedIds, true);
            }}
          >
            all
          </button>
          <button
            type="button"
            aria-label={`All ${group.label.toLowerCase()} off`}
            className="text-accent hover:underline"
            onClick={() => {
              actions.setClassSkills(ids, false);
            }}
          >
            none
          </button>
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {chains.map((chain) => (
          <SkillChainView
            key={requireDefined(chain.tiles[0], 'empty chain').skill.id}
            chain={chain}
            level={level}
            litIds={litIds}
          />
        ))}
      </div>
    </section>
  );
}

/**
 * The character's own buffs and passives (plan feedback 2026-09-03, item 1) as icon tiles, each
 * applied maxed: max level, synergy sources maxed, caster-stat scalings at their caps. Variations
 * of one skill form a chain and are mutually exclusive; permanent passives start on, everything
 * else is opt-in. Skills above the character's level are locked: an active one stays selected
 * (the engine skips it) and lights up again once the level allows it.
 */
export function ClassSkillsCard() {
  const data = useGameData();
  const jobId = useAppStore((state) => state.build.character.jobId);
  const level = useAppStore((state) => state.build.character.level);
  const activeIds = useAppStore((state) => state.build.buffs.classSkillIds);
  const groups = useMemo(
    () =>
      GROUPS.map((group) => ({ group, chains: chainsFor(data, jobId, group.kinds) })).filter(
        ({ chains }) => chains.length > 0,
      ),
    [data, jobId],
  );
  const litIds = new Set(
    activeIds.filter((id) => {
      const skill = data.classSkills.get(id);

      return skill !== undefined && isClassSkillUnlocked(skill, level);
    }),
  );

  return (
    <Card>
      <CardTitle
        right={<span className="font-mono text-[11px] text-muted">{litIds.size} active</span>}
      >
        Class skills
      </CardTitle>
      <Hint className="mb-3">Max level, synergies maxed, caster stats at their caps.</Hint>
      <div className="flex flex-col gap-3">
        {groups.map(({ group, chains }) => (
          <ClassSkillGroup
            key={group.label}
            group={group}
            chains={chains}
            level={level}
            litIds={litIds}
          />
        ))}
      </div>
    </Card>
  );
}
