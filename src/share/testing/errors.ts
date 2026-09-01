import { ShareDecodeError, type ShareErrorCode } from '../errors';

/**
 * Runs `fn` and returns the code of the {@link ShareDecodeError} it throws, or `undefined` when it
 * returns normally. Any other error propagates, so an unexpected failure still fails the test.
 */
export function decodeErrorCode(fn: () => unknown): ShareErrorCode | undefined {
  let code: ShareErrorCode | undefined;

  try {
    fn();
  } catch (error) {
    if (!(error instanceof ShareDecodeError)) {
      throw error;
    }

    code = error.code;
  }

  return code;
}
