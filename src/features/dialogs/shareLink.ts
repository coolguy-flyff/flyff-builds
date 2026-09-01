/** The page URL without query or hash: `https://<host>/<path>`, the base of a share link (plan A0.2). */
export function shareBaseUrl(location: Pick<Location, 'origin' | 'pathname'>): string {
  return `${location.origin}${location.pathname}`;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
