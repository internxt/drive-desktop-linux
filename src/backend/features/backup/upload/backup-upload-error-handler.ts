import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { INITIAL_RATE_LIMIT_DELAY_MS, MAX_BACKOFF_MS, RETRY_DELAYS_MS } from './constants';

function exponentialBackoff(attempts: number, baseMs: number): number {
  return Math.min(baseMs * Math.pow(2, attempts - 1), MAX_BACKOFF_MS);
}

export function createBackupUploadErrorHandler(path: string): (error: DriveDesktopError) => number | null {
  let transientAttempts = 0;

  return (error: DriveDesktopError): number | null => {
    if (error.cause === 'RATE_LIMITED' || error.cause === 'INTERNAL_SERVER_ERROR') {
      transientAttempts++;
      const base =
        error.cause === 'RATE_LIMITED' ? Number(error.message) || INITIAL_RATE_LIMIT_DELAY_MS : RETRY_DELAYS_MS[0];
      const delayMs = exponentialBackoff(transientAttempts, base);
      logger.debug({
        tag: 'BACKUPS',
        msg: `[${error.cause}] Attempt ${transientAttempts}, waiting ${delayMs}ms`,
        path,
      });
      return delayMs;
    }

    return null;
  };
}
