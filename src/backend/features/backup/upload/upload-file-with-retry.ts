/* eslint-disable no-await-in-loop */
import { Environment } from '@internxt/inxt-js';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { File } from '../../../../context/virtual-drive/files/domain/File';
import { createFileToBackend } from './create-file-to-backend';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { sleep } from './utils/sleep';
import { uploadContentToEnvironment } from './upload-content-to-environment';
import { Result } from '../../../../context/shared/domain/Result';
import { INITIAL_RATE_LIMIT_DELAY_MS, MAX_BACKOFF_MS, MAX_RETRIES, RETRY_DELAYS_MS } from './constants';
import { deleteFileFromStorageByFileId } from '../../../../infra/drive-server/services/files/services/delete-file-content-from-bucket';

export type UploadFileParams = {
  path: string;
  size: number;
  bucket: string;
  folderId: number;
  folderUuid: string;
  environment: Environment;
  signal: AbortSignal;
};

// This file substitutes fileBatchUploader
function isAlreadyExistsError(error: DriveDesktopError): boolean {
  return error.cause === 'FILE_ALREADY_EXISTS';
}
export async function uploadFileWithRetry(file: UploadFileParams): Promise<Result<File | null, DriveDesktopError>> {
  let rateLimitAttempts = 0;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (file.signal.aborted) {
      return { data: null };
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

      const metadataResult = await createFileToBackend({
        contentsId,
        filePath: file.path,
        size: file.size,
        folderId: file.folderId,
        folderUuid: file.folderUuid,
        bucket: file.bucket,
      });

      if (metadataResult.error) {
        await deleteFileFromStorageByFileId({ bucketId: file.bucket, fileId: contentsId });
        throw metadataResult.error;
      }

      return { data: metadataResult.data };
    } catch (error) {
      const driveError = error instanceof DriveDesktopError ? error : new DriveDesktopError('UNKNOWN');

      if (file.signal.aborted) {
        return { data: null };
      }

      if (isAlreadyExistsError(driveError)) {
        logger.debug({
          tag: 'BACKUPS',
          msg: `[FILE ALREADY EXISTS] Skipping file ${file.path} - already exists remotely`,
        });
        return { data: null };
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
          msg: `Upload attempt ${attempt + 1} failed, retrying in ${delay}ms`,
          path: file.path,
          error: driveError.message,
        });
        await sleep(delay);
        continue;
      }

      return { error: driveError };
    }
  }

  return { error: new DriveDesktopError('UNKNOWN', 'Upload failed after max retries') };
}
