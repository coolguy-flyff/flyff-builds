export type ClassValue = string | false | null | undefined;

/** Joins conditional class names, skipping falsy entries. */
export function cx(...values: readonly ClassValue[]): string {
  return values
    .filter((value): value is string => typeof value === 'string' && value !== '')
    .join(' ');
}
