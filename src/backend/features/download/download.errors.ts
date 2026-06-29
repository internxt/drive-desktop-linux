import type { AxiosError } from 'axios';
import { parseRetryAfterMs } from '../../common/rate-limit/transient-error-handler';
import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';

type AxiosLikeError = AxiosError & { status?: number; code?: string };

function getHttpStatus(error: AxiosLikeError) {
  return error.status ?? error.response?.status;
}

function isContentLengthMismatch(error: AxiosLikeError) {
  return error.code === 'ERR_CONTENT_LENGTH_MISMATCH' || error.message.includes('ERR_CONTENT_LENGTH_MISMATCH');
}

function isTransientNetworkError(error: AxiosLikeError) {
  const transientCodes = new Set(['ECONNRESET', 'ETIMEDOUT', 'ERR_TIMED_OUT', 'EAI_AGAIN', 'ECONNREFUSED']);

  return (
    (typeof error.code === 'string' && transientCodes.has(error.code)) ||
    error.message.includes('ERR_EMPTY_RESPONSE') ||
    error.message.includes('ERR_CONNECTION_RESET') ||
    error.message.includes('ERR_TIMED_OUT')
  );
}

export function mapDownloadError(error: unknown) {
  const axiosError = error as AxiosLikeError;
  const status = getHttpStatus(axiosError);
  const message = axiosError.message;

  if (status === 429) {
    return new DriveDesktopError('RATE_LIMITED', String(parseRetryAfterMs(message)));
  }

  if (typeof status === 'number' && status >= 500) {
    return new DriveDesktopError('INTERNAL_SERVER_ERROR', message);
  }

  if (isContentLengthMismatch(axiosError)) {
    return new DriveDesktopError('INTERNAL_SERVER_ERROR', message);
  }

  if (isTransientNetworkError(axiosError)) {
    return new DriveDesktopError('INTERNAL_SERVER_ERROR', message);
  }

  return new DriveDesktopError('UNKNOWN', message);
}
