import type { CoupleSkill } from '@/data';
import { Card, CardTitle } from '@/components/Card';
import { SkillIcon } from '@/components/ItemIcon';
import { Toggle } from '@/components/Toggle';
import { Tooltip } from '@/components/Tooltip';
import { cx } from '@/lib/cx';
import { useActions, useAppStore, useGameData } from '@/state';

import { effectTextOrNone, splitEffectText } from './effectText';

const SECONDS_PER_MINUTE = 60;

/** "Couple Lv 13 · 10 min" — when the couple unlocks the skill and how long a cast lasts. */
function skillMeta(skill: CoupleSkill): string {
  const parts = [`Couple Lv ${skill.coupleLevel}`];

  if (skill.durationSeconds !== undefined) {
    parts.push(`${Math.round(skill.durationSeconds / SECONDS_PER_MINUTE)} min`);
  }

  return parts.join(' · ');
}

function CoupleSkillRow({
  skill,
  active,
  onToggle,
}: {
  skill: CoupleSkill;
  active: boolean;
  onToggle: () => void;
}) {
  const data = useGameData();
  const effect = effectTextOrNone(data, skill.abilities);

  return (
    <Tooltip
      className="w-full"
      content={
        <div className="flex flex-col gap-0.5">
          <span className="font-semibold text-text">{skill.name}</span>
          <span className="text-dim">{skillMeta(skill)}</span>
          {splitEffectText(effect).map((line) => (
            <span key={line}>{line}</span>
          ))}
        </div>
      }
    >
      <div
        className="flex w-full cursor-pointer items-center gap-2 rounded-control bg-sub px-2.5 py-1.5 transition-colors select-none hover:bg-control"
        onClick={onToggle}
      >
        <span
          className="inline-flex"
          onClick={(event) => {
            event.stopPropagation();
          }}
        >
          <Toggle label={skill.name} checked={active} onChange={onToggle} />
        </span>
        <SkillIcon icon={skill.icon} size={22} className={active ? undefined : 'opacity-50'} />
        <div className="min-w-0 flex-1">
          <div className={cx('truncate text-[11.5px]', active ? 'text-text' : 'text-muted')}>
            {skill.name}
          </div>
          <div className={cx('truncate font-mono text-[10px]', active ? 'text-muted' : 'text-dim')}>
            {effect}
          </div>
        </div>
      </div>
    </Tooltip>
  );
}

/**
 * The couple's buffs (API `/couple`), listed by the couple level that unlocks them. Only skills
 * that reach the results are offered; EXP, drop and flight perks are left out. The title switch
 * turns them all on or off.
 */
export function CoupleSkillsCard() {
  const data = useGameData();
  const activeIds = useAppStore((state) => state.build.buffs.coupleSkillIds);
  const actions = useActions();
  const skills = data.coupleSkills;
  const active = new Set(activeIds);
  const activeCount = skills.filter((skill) => active.has(skill.id)).length;

  return (
    <Card>
      <CardTitle
        right={
          <>
            <span className="mr-1 font-mono text-[11px] text-muted">
              {activeCount} / {skills.length}
            </span>
            <Toggle
              size="lg"
              label="All couple skills"
              checked={skills.length > 0 && activeCount === skills.length}
              disabled={skills.length === 0}
              onChange={(checked) => {
                actions.setIdsInList(
                  'coupleSkillIds',
                  skills.map((skill) => skill.id),
                  checked,
                );
              }}
            />
          </>
        }
      >
        Couple skills
      </CardTitle>
      <div className="grid grid-cols-2 gap-1.5">
        {skills.map((skill) => (
          <CoupleSkillRow
            key={skill.id}
            skill={skill}
            active={active.has(skill.id)}
            onToggle={() => {
              actions.toggleIdInList('coupleSkillIds', skill.id);
            }}
          />
        ))}
      </div>
    </Card>
  );
}
