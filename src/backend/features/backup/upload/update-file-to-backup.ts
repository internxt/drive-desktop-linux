import { Environment } from '@internxt/inxt-js';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../../context/shared/domain/Result';
import { uploadContentToEnvironment } from './upload-content-to-environment';
import { retryWithBackoff } from '../../../../shared/retry-with-backoff';
import { createTransientErrorHandler } from '../../../../backend/common/rate-limit/transient-error-handler';
import { FileSizeLimitModule, logger } from '@internxt/drive-desktop-core/build/backend';
import { overrideFileToBackend } from './override-file-to-backend';
import { getFileSizeLimitAdapter } from '../../user/file-size-limit/get-file-size-limit-adapter';
import { handleUploadFileSizeLimitExceeded } from '../../user/file-size-limit/handle-upload-file-size-limit-exceeded';
import { unregisterRejectedUploadForSize } from '../../user/file-size-limit/unregister-rejected-upload-for-size';

export type UpdateFileParams = {
  path: string;
  size: number;
  bucket: string;
  fileUuid: string;
  environment: Environment;
  signal: AbortSignal;
};

async function updateFile(file: UpdateFileParams): Promise<Result<void, DriveDesktopError>> {
  if (file.size <= 0) {
    logger.warn({
      tag: 'BACKUPS',
      msg: 'Skipping backup file update because it is empty',
      path: file.path,
      size: file.size,
    });
    return { data: undefined };
  }

  const validation = await FileSizeLimitModule.checkUploadFileSize({
    size: file.size,
    ...getFileSizeLimitAdapter(),
  });

  if (!validation.allowed) {
    handleUploadFileSizeLimitExceeded({
      path: file.path,
      fileSize: file.size,
      kind: 'backup',
      validation,
      blockUploadPath: false,
    });
    return { data: undefined };
  }

  const { data: contentsId, error } = await retryWithBackoff(
    () =>
      uploadContentToEnvironment({
        path: file.path,
        size: file.size,
        bucket: file.bucket,
        environment: file.environment,
        signal: file.signal,
      }),
    createTransientErrorHandler({ tag: 'BACKUPS', context: 'BACKUP UPLOAD RETRY', path: file.path }),
    file.signal,
  );

  if (error) {
    return { error };
  }

  if (file.signal.aborted) {
    return { data: undefined };
  }

  const overrideResult = await retryWithBackoff(
    () =>
      overrideFileToBackend({
        fileUuid: file.fileUuid,
        fileContentsId: contentsId,
        fileSize: file.size,
      }),
    createTransientErrorHandler({ tag: 'BACKUPS', context: 'BACKUP UPLOAD RETRY', path: file.path }),
    file.signal,
  );

  if (overrideResult.error) {
    if (overrideResult.error.cause === 'FILE_TOO_BIG') {
      handleUploadFileSizeLimitExceeded({
        path: file.path,
        fileSize: file.size,
        kind: 'backup',
        blockUploadPath: false,
      });
      return { data: undefined };
    }

    return { error: overrideResult.error };
  }

  unregisterRejectedUploadForSize({ path: file.path });

  return { data: undefined };
}

export async function updateFileToBackup(file: UpdateFileParams): Promise<Result<void, DriveDesktopError>> {
  return updateFile(file);
}
