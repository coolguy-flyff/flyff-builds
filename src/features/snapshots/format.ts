import type { SnapshotMeta } from '@/persistence';

const SAVED_AT_FORMAT = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

export function pluralize(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/** `Aug 30, 21:14` in the viewer's locale. */
export function formatSavedAt(savedAt: number): string {
  return SAVED_AT_FORMAT.format(savedAt);
}

/** Meta line of a snapshot row (plan D7): `Seraph · Lv 190 · 4 swaps · Aug 30, 21:14 · automatic`. */
export function snapshotMetaLine(jobName: string, meta: SnapshotMeta): string {
  const parts = [
    jobName,
    `Lv ${meta.level}`,
    pluralize(meta.swapCount, 'swap'),
    formatSavedAt(meta.savedAt),
  ];

  if (meta.automatic) {
    parts.push('automatic');
  }

  return parts.join(' · ');
}
