const PREFIX = 'flyffbuilds.v1';

export const STORAGE_KEYS = {
  current: `${PREFIX}.current`,
  snapshotIndex: `${PREFIX}.snapshots.index`,
  snapshot: (id: string) => `${PREFIX}.snapshot.${id}`,
  corrupt: (timestamp: number) => `${PREFIX}.corrupt.${timestamp}`,
  /** Last visited hash route, so a bare URL reopens the same tab. */
  lastRoute: `${PREFIX}.route`,
} as const;
