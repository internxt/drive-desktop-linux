import { logger } from '@internxt/drive-desktop-core/build/backend';
import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { extractPropertyFromStringyfiedJson } from '../../../shared/extract-property-from-json';
import {
  INITIAL_CONNECTION_TIMEOUT_DELAY_MS,
  INITIAL_PARENT_FOLDER_NOT_FOUND_DELAY_MS,
  INITIAL_RATE_LIMIT_DELAY_MS,
  INITIAL_SERVER_ERROR_DELAY_MS,
  MAX_BACKOFF_MS,
} from './constants';

export function parseRetryAfterMs(message?: string) {
  const retryAfterSeconds = extractPropertyFromStringyfiedJson(message ?? '', 'retry_after');
  return typeof retryAfterSeconds === 'number' ? retryAfterSeconds * 1000 : INITIAL_RATE_LIMIT_DELAY_MS;
}

function isConnectionTimeoutError(err: Error & { code?: unknown }) {
  if (err.code === 'ETIMEDOUT' || err.code === 'UND_ERR_CONNECT_TIMEOUT') {
    return true;
  }

  return err.message.includes('Connect Timeout Error');
}

export function mapEnvironmentUploadError(err: Error & { code?: unknown; status?: unknown }): DriveDesktopError {
  if (err.code === 'EACCES' || err.code === 'EPERM') {
    return new DriveDesktopError('ACTION_NOT_PERMITTED', err.message);
  }

  if (isConnectionTimeoutError(err)) {
    return new DriveDesktopError('CONNECTION_TIMEOUT', err.message);
  }

  if (err.message === 'Max space used') {
    return new DriveDesktopError('NOT_ENOUGH_SPACE');
  }
  if (typeof err.status === 'number') {
    if (err.status === 429) {
      return new DriveDesktopError('RATE_LIMITED', String(parseRetryAfterMs(err.message)));
    }
    if (err.status >= 500) {
      return new DriveDesktopError('INTERNAL_SERVER_ERROR');
    }
  }
  return new DriveDesktopError('UNKNOWN', err.message);
}

function exponentialBackoff(attempts: number, baseMs: number) {
  return Math.min(baseMs * Math.pow(2, attempts - 1), MAX_BACKOFF_MS);
}

const RETRYABLE_CAUSES = ['RATE_LIMITED', 'CONNECTION_TIMEOUT', 'INTERNAL_SERVER_ERROR', 'PARENT_FOLDER_NOT_FOUND'] as const;

type RetryableCause = (typeof RETRYABLE_CAUSES)[number];

function isRetryableCause(cause: DriveDesktopError['cause']): cause is RetryableCause {
  return RETRYABLE_CAUSES.includes(cause as RetryableCause);
}

function getRetryBaseDelay(error: DriveDesktopError) {
  if (error.cause === 'RATE_LIMITED') {
    return Number(error.message) || INITIAL_RATE_LIMIT_DELAY_MS;
  }

  if (error.cause === 'CONNECTION_TIMEOUT') {
    return INITIAL_CONNECTION_TIMEOUT_DELAY_MS;
  }

  if (error.cause === 'INTERNAL_SERVER_ERROR') {
    return INITIAL_SERVER_ERROR_DELAY_MS;
  }

  if (error.cause === 'PARENT_FOLDER_NOT_FOUND') {
    return INITIAL_PARENT_FOLDER_NOT_FOUND_DELAY_MS;
  }

  return INITIAL_RATE_LIMIT_DELAY_MS;
}

type Props = {
  tag: 'BACKUPS' | 'SYNC-ENGINE';
  context: string;
  path: string;
};

export function createTransientErrorHandler({ tag, context, path }: Props) {
  let transientAttempts = 0;

  return (error: DriveDesktopError): number | null => {
    if (isRetryableCause(error.cause)) {
      transientAttempts++;

      const baseDelayMs = getRetryBaseDelay(error);

      const delayMs = exponentialBackoff(transientAttempts, baseDelayMs);

      logger.debug({
        tag,
        msg: `[${context}]`,
        cause: error.cause,
        attempt: transientAttempts,
        delayMs,
        path,
      });

      return delayMs;
    }

    return null;
  };
}
