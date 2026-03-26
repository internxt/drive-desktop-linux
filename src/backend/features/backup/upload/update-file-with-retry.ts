/* eslint-disable no-await-in-loop */
import { Environment } from '@internxt/inxt-js';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../../context/shared/domain/Result';
import { overrideFile } from '../../../../infra/drive-server/services/files/services/override-file';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { sleep } from './utils/sleep';
import { uploadContentToEnvironment } from './upload-content-to-environment';
import { INITIAL_RATE_LIMIT_DELAY_MS, MAX_BACKOFF_MS, MAX_RETRIES, RETRY_DELAYS_MS } from './constants';

export type UpdateFileParams = {
  path: string;
  size: number;
  bucket: string;
  fileUuid: string;
  environment: Environment;
  signal: AbortSignal;
};
// This file substitutes FileBatchUpdater
export async function updateFileWithRetry(file: UpdateFileParams): Promise<Result<void, DriveDesktopError>> {
  let rateLimitAttempts = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (file.signal.aborted) {
      return { data: undefined };
    }

    try {
      const { data: contentsId, error } = await uploadContentToEnvironment({
        path: file.path,
        size: file.size,
        bucket: file.bucket,
        environment: file.environment,
        signal: file.signal,
      });

      if (error) {
        throw error;
      }

      const overrideResult = await overrideFile({
        fileUuid: file.fileUuid,
        fileContentsId: contentsId,
        fileSize: file.size,
      });

      if (overrideResult.error) {
        throw new DriveDesktopError('BAD_RESPONSE', `Failed to override file ${file.path}`);
      }

      return { data: undefined };
    } catch (error) {
      const driveError = error instanceof DriveDesktopError ? error : new DriveDesktopError('UNKNOWN');

      if (file.signal.aborted) {
        return { data: undefined };
      }

      if (driveError.cause === 'RATE_LIMITED') {
        rateLimitAttempts++;
        const baseDelay = Number(driveError.message) || INITIAL_RATE_LIMIT_DELAY_MS;
        const retryAfterMs = Math.min(baseDelay * Math.pow(2, rateLimitAttempts - 1), MAX_BACKOFF_MS);
        logger.debug({
          tag: 'BACKUPS',
          msg: `[RATE LIMITED] Attempt ${rateLimitAttempts}, waiting ${retryAfterMs}ms before retrying`,
          path: file.path,
        });
        await sleep(retryAfterMs);
        attempt--;
        continue;
      }

      if (driveError.cause === 'UNKNOWN') {
        const retryAfterMs = Math.min(RETRY_DELAYS_MS[0] * Math.pow(2, attempt), MAX_BACKOFF_MS);
        logger.debug({
          tag: 'BACKUPS',
          msg: `[UNKNOWN ERROR] Attempt ${attempt + 1}, waiting ${retryAfterMs}ms before retrying`,
          path: file.path,
          error: driveError.message,
        });
        await sleep(retryAfterMs);
        attempt--;
        continue;
      }

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS_MS[attempt];
        logger.debug({
          tag: 'BACKUPS',
          msg: `Update attempt ${attempt + 1} failed, retrying in ${delay}ms`,
          path: file.path,
          error: driveError.message,
        });
        await sleep(delay);
        continue;
      }

      return { error: driveError };
    }
  }

  return { error: new DriveDesktopError('UNKNOWN', 'Update failed after max retries') };
}
