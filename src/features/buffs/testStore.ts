import { loadBundledGameData, type GameData } from '@/data';
import { createDefaultBuild } from '@/domain/build';
import { createMemoryStorage } from '@/persistence';
import { createAppStore, type AppStoreApi } from '@/state';

let cached: GameData | undefined;

/** The bundled game data, parsed once per test file. */
export function testGameData(): GameData {
  cached ??= loadBundledGameData();

  return cached;
}

/** An isolated store over the default build (Seraph 190, one empty swap) and in-memory storage. */
export function createTestStore(data: GameData = testGameData()): AppStoreApi {
  return createAppStore(
    { data, storage: createMemoryStorage(), now: () => 1 },
    createDefaultBuild(data),
  );
}
