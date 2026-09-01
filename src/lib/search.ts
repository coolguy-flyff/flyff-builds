const APOSTROPHES = /[‘’`´]/g;
const DIACRITICS = /[̀-ͯ]/g;

/** Lower-cases, strips diacritics and unifies apostrophes so "Adept’s" matches "adept's". */
export function normalizeSearchText(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS, '').replace(APOSTROPHES, "'").toLowerCase();
}

/** Every whitespace-separated token of the query must appear somewhere in the text. */
export function matchesQuery(text: string, query: string): boolean {
  const haystack = normalizeSearchText(text);
  const tokens = normalizeSearchText(query)
    .split(/\s+/)
    .filter((token) => token !== '');

  return tokens.every((token) => haystack.includes(token));
}
