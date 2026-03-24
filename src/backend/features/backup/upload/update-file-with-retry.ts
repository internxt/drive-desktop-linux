/* eslint-disable no-await-in-loop */
import { Environment } from '@internxt/inxt-js';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../../context/shared/domain/Result';
import { overrideFile } from '../../../../infra/drive-server/services/files/services/override-file';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { sleep } from './utils/sleep';
import { uploadContentToEnvironment } from './upload-content-to-environment';
import { MAX_RETRIES, RETRY_DELAYS_MS } from './constants';

export type UpdateFileParams = {
  path: string;
  size: number;
  bucket: string;
  fileUuid: string;
  environment: Environment;
  signal: AbortSignal;
};

export async function updateFileWithRetry(file: UpdateFileParams): Promise<Result<void, DriveDesktopError>> {
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
