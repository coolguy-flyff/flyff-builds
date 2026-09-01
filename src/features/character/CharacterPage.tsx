import { JobCard } from './JobCard';
import { LevelCard } from './LevelCard';
import { StatPagesSection } from './StatPagesSection';

/** Character tab (plan A1 / D4): level + job on the left, stat pages on the right. */
export function CharacterPage() {
  return (
    <div className="grid items-start gap-3.5 lg:grid-cols-[440px_1fr]">
      <div className="flex flex-col gap-3.5">
        <LevelCard />
        <JobCard />
      </div>
      <StatPagesSection />
    </div>
  );
}
