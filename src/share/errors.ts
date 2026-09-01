/**
 * Error types of the share codec. Every input-dependent failure while decoding is a
 * {@link ShareDecodeError} carrying a {@link ShareErrorCode}; `decodeShareCode` turns those into a
 * failure result with the matching user-facing message. A build the byte layout cannot represent
 * throws {@link ShareEncodeError}.
 */

export type ShareErrorCode =
  'NOT_A_CODE' | 'BAD_BASE64' | 'UNSUPPORTED_VERSION' | 'CORRUPT' | 'TRUNCATED' | 'LIMIT_EXCEEDED';

/** User-facing messages, shown verbatim by the Import dialog. */
export const SHARE_ERROR_MESSAGES: Readonly<Record<ShareErrorCode, string>> = {
  NOT_A_CODE: 'Not a valid Flyff Builds code',
  BAD_BASE64: 'Corrupted code',
  UNSUPPORTED_VERSION: 'Code was made with a newer version of Flyff Builds',
  CORRUPT: 'Corrupted code',
  TRUNCATED: 'Corrupted code',
  LIMIT_EXCEEDED: 'Code exceeds the supported build size',
};

/** The `message` is a technical detail for logs; the user-facing text is keyed by `code`. */
export class ShareDecodeError extends Error {
  readonly code: ShareErrorCode;

  constructor(code: ShareErrorCode, detail: string, options?: ErrorOptions) {
    super(`${code}: ${detail}`, options);
    this.name = 'ShareDecodeError';
    this.code = code;
  }
}

export class ShareEncodeError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ShareEncodeError';
  }
}
