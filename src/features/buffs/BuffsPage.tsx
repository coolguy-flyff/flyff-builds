import { SwapsSection } from '@/features/swaps/SwapsSection';

import { AchievementCard } from './AchievementCard';
import { ClassSkillsCard } from './ClassSkillsCard';
import { HousingNpcsCard } from './HousingNpcsCard';
import { PremiumItemsCard } from './PremiumItemsCard';
import { RmBuffsCard } from './RmBuffsCard';

/** Buffs & Swaps tab (plan A3 / D5): global buffs on the left, the swaps to compare on the right. */
export function BuffsPage() {
  return (
    <div className="grid items-start gap-3.5 lg:grid-cols-[440px_1fr]">
      <div className="flex flex-col gap-3.5">
        <RmBuffsCard />
        <ClassSkillsCard />
        <PremiumItemsCard />
        <HousingNpcsCard />
        <AchievementCard />
      </div>
      <SwapsSection />
    </div>
  );
}
