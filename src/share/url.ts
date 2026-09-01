/**
 * Share codes travel in the query string (`?b=<code>`) so they survive hash routing. The input
 * parser is deliberately lenient about *where* the code sits (full link, fragment, bare code) but
 * strict about the code itself: only base64url characters are accepted.
 */

const BARE_CODE = /^[A-Za-z0-9_-]+$/;
/** `b=<code>` at the start or after a `?`, `#` or `&`, ending at the end or the next `#`/`&`. */
const EMBEDDED_CODE = /(?:^|[?#&])b=([A-Za-z0-9_-]+)(?=$|[#&])/;

/** Extracts the share code from a link, a `?b=`/`#b=`/`b=` fragment or a bare code. */
export function parseShareInput(text: string): string | undefined {
  const trimmed = text.trim();
  let code: string | undefined;

  if (BARE_CODE.test(trimmed)) {
    code = trimmed;
  } else {
    code = EMBEDDED_CODE.exec(trimmed)?.[1];
  }

  return code;
}

export function buildShareUrl(base: string, code: string): string {
  return `${base}?b=${code}#/results`;
}
