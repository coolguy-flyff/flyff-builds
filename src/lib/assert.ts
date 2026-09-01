export class InvariantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvariantError';
  }
}

/**
 * Throws when a condition the code relies on does not hold. Use for programmer errors, never for
 * user-input validation (that goes through zod / domain validation and surfaces as issues).
 */
export function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new InvariantError(message);
  }
}

export function requireDefined<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new InvariantError(message);
  }

  return value;
}
