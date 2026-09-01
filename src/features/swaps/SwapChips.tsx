import type { Issue } from '@/domain/build';
import { Chip } from '@/components/Chip';

/** Composition chips of a swap; duplicates are possible (two identical weapons), hence index keys. */
export function SwapChips({ chips }: { chips: readonly string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {chips.map((chip, index) => (
        <Chip key={`${index}-${chip}`}>{chip}</Chip>
      ))}
    </div>
  );
}

/** One warning/error chip per validation issue of the swap. */
export function IssueChips({ issues }: { issues: readonly Issue[] }) {
  return (
    <>
      {issues.map((issue) => (
        <Chip
          key={issue.code}
          tone={issue.severity === 'error' ? 'danger' : 'warn'}
          title={issue.message}
        >
          {issue.message}
        </Chip>
      ))}
    </>
  );
}
