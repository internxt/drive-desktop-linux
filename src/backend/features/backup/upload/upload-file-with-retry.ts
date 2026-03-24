/* eslint-disable no-await-in-loop */
import { Environment } from '@internxt/inxt-js';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { File } from '../../../../context/virtual-drive/files/domain/File';
import { deleteContentFromEnvironment } from './delete-content-from-environment';
import { createFileToBackend } from './create-file-to-backend';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { sleep } from './utils/sleep';
import { uploadContentToEnvironment } from './upload-content-to-environment';
import { Result } from '../../../../context/shared/domain/Result';
import { MAX_RETRIES, RETRY_DELAYS_MS } from './constants';


export type UploadFileParams = {
  path: string;
  size: number;
  bucket: string;
  folderId: number;
  folderUuid: string;
  environment: Environment;
  signal: AbortSignal;
};

/**
 * Check if error indicates file already exists
 * Same logic as FileBatchUploader error handling
 */
function isAlreadyExistsError(error: DriveDesktopError): boolean {
  return error.cause === 'FILE_ALREADY_EXISTS';
}
export async function uploadFileWithRetry(file: UploadFileParams): Promise<Result<File | null, DriveDesktopError>> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (file.signal.aborted) {
      return { error: new DriveDesktopError('UNKNOWN', 'Upload aborted') };
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
        await deleteContentFromEnvironment(file.bucket, contentsId);
        throw metadataResult.error;
      }

      return { data: metadataResult.data };
    } catch (error) {
      const driveError = error instanceof DriveDesktopError ? error : new DriveDesktopError('UNKNOWN');

      if (isAlreadyExistsError(driveError)) {
        logger.debug({
          tag: 'BACKUPS',
          msg: `[FILE ALREADY EXISTS] Skipping file ${file.path} - already exists remotely`,
        });
        return { data: null };
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
