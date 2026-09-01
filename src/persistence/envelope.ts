import type { GameData } from '@/data';
import {
  BUILD_SCHEMA_VERSION,
  migrateToCurrent,
  validateBuild,
  type BuildState,
  type ValidatedBuild,
} from '@/domain/build';

/**
 * Every persisted build (working copy, snapshot) is wrapped in the same envelope so one parse path
 * (JSON → migrate → structural validation → semantic repair) serves all of them.
 */
export const ENVELOPE_FORMAT = 'flyffbuilds';

export interface Envelope {
  readonly format: typeof ENVELOPE_FORMAT;
  readonly schemaVersion: number;
  readonly savedAt: number;
  readonly name?: string;
  readonly build: BuildState;
}

export interface ParsedEnvelope {
  readonly validated: ValidatedBuild;
  readonly savedAt: number;
  readonly name: string | undefined;
}

export interface EnvelopeError {
  readonly code: 'not-json' | 'not-envelope' | 'structure';
  readonly message: string;
}

export type EnvelopeParseResult =
  | { readonly ok: true; readonly value: ParsedEnvelope }
  | { readonly ok: false; readonly error: EnvelopeError };

export function serializeEnvelope(build: BuildState, savedAt: number, name?: string): string {
  const envelope: Envelope = {
    format: ENVELOPE_FORMAT,
    schemaVersion: BUILD_SCHEMA_VERSION,
    savedAt,
    ...(name === undefined ? {} : { name }),
    build,
  };

  return JSON.stringify(envelope);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function parseEnvelope(data: GameData, raw: string): EnvelopeParseResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);

    return {
      ok: false,
      error: { code: 'not-json', message: `Stored build is not JSON: ${reason}` },
    };
  }

  if (!isRecord(parsed) || parsed.format !== ENVELOPE_FORMAT || !isRecord(parsed.build)) {
    return {
      ok: false,
      error: { code: 'not-envelope', message: 'Stored data is not a Flyff Builds envelope' },
    };
  }

  const migrated = migrateToCurrent({ ...parsed.build, schemaVersion: parsed.schemaVersion });
  const validated = validateBuild(data, migrated);
  let result: EnvelopeParseResult;

  if (validated.ok) {
    result = {
      ok: true,
      value: {
        validated: validated.value,
        savedAt: typeof parsed.savedAt === 'number' ? parsed.savedAt : 0,
        name: typeof parsed.name === 'string' ? parsed.name : undefined,
      },
    };
  } else {
    result = { ok: false, error: { code: 'structure', message: validated.error.message } };
  }

  return result;
}
