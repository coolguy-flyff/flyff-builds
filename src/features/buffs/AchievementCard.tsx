import { Card, CardTitle } from '@/components/Card';
import { Tile, TileGroup } from '@/components/Tile';
import { useActions, useAppStore, useGameData } from '@/state';

import { achievementShortName, formatAbilityList } from './effectText';

/** Badge images are served from public/achievements (GPL assets from Flyffulator, see README). */
const BADGE_BASE_URL = '/achievements/';

/** 2026 FWC achievement (plan A3.1): a radio of tiles, "None" first. */
export function AchievementCard() {
  const data = useGameData();
  const achievementId = useAppStore((state) => state.build.buffs.achievementId);
  const actions = useActions();
  const selected = data.achievements.find((achievement) => achievement.id === achievementId);

  const select = (id: number | null): void => {
    actions.updateBuffs((buffs) => {
      buffs.achievementId = id;
    });
  };

  const caption =
    selected === undefined ? 'No achievement bonus' : formatAbilityList(data, selected.abilities);

  return (
    <Card>
      <CardTitle>2026 FWC achievement</CardTitle>
      <TileGroup label="FWC achievement" columns={6}>
        <Tile
          selected={achievementId === null}
          onSelect={() => {
            select(null);
          }}
          icon={
            <span aria-hidden="true" className="flex h-[26px] items-center text-[15px] text-muted">
              —
            </span>
          }
          label="None"
          surface="sub"
        />
        {data.achievements.map((achievement) => (
          <Tile
            key={achievement.id}
            selected={achievement.id === achievementId}
            onSelect={() => {
              select(achievement.id);
            }}
            icon={
              <img
                src={`${BADGE_BASE_URL}${achievement.image}`}
                alt=""
                width={56}
                height={26}
                loading="lazy"
                className="h-[26px] w-auto max-w-full object-contain"
              />
            }
            label={achievementShortName(achievement.name)}
            surface="sub"
          />
        ))}
      </TileGroup>
      <p className="mt-2.5 font-mono text-[11px] text-muted">{caption}</p>
    </Card>
  );
}
