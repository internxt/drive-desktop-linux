import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { type Result } from '../../../../../context/shared/domain/Result';
import { FuseError, FuseIOError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { TemporalFileByPathFinder } from '../../../../../context/storage/TemporalFiles/application/find/TemporalFileByPathFinder';
import { TemporalFileUploadQueue } from '../../../../../context/storage/TemporalFiles/application/upload/TemporalFileUploadQueue';
import { TemporalFileDeleter } from '../../../../../context/storage/TemporalFiles/application/deletion/TemporalFileDeleter';
import { UploadSizeLimitError } from '../../../user/file-size-limit/upload-size-limit-error';
import { DriveDesktopError } from '../../../../../context/shared/domain/errors/DriveDesktopError';
import { addVirtualDriveIssue } from '../../../../../apps/main/issues/virtual-drive';

import {
  clearUploadSizeLimitBlockedPath,
  isUploadSizeLimitBlockedPath,
} from '../../../user/file-size-limit/add-max-file-size-rejection';
type Props = {
  path: string;
  processName: string;
  container: Container;
};

// v.2.6.0
// Esteban Galvis Triana
// For files with unusual extensions or when the system has to figure
// out which app to use to open them—two file descriptors end up being created:
// one for metadata and one for the actual content.
// The issue is that when each descriptor closes, it triggers a release,
// resulting in a duplicate request to create the file remotely.
export async function release({ path, processName, container }: Props): Promise<Result<void, FuseError>> {
  try {
    const temporalFile = await container.get(TemporalFileByPathFinder).run(path);

    if (!temporalFile) {
      logger.debug({ msg: '[Release] No temporal file found, nothing to upload', path, processName });
      return { data: undefined };
    }

    if (temporalFile.isAuxiliary()) {
      logger.debug({ msg: '[Release] Auxiliary file detected, deleting without upload', path, processName });
      await container.get(TemporalFileDeleter).run(path);
      return { data: undefined };
    }

    if (isUploadSizeLimitBlockedPath(path)) {
      logger.warn({
        msg: '[Release] Upload size limit blocked file detected, deleting partial temporal file without upload',
        path,
        processName,
      });
      await container.get(TemporalFileDeleter).run(path);
      return { data: undefined };
    }

    try {
      await container.get(TemporalFileUploadQueue).enqueue({ temporalFile, path, processName });
      logger.debug({ msg: '[Release] Temporal file queued for upload', path, processName });
      return { data: undefined };
    } catch (uploadError) {
      if (uploadError instanceof UploadSizeLimitError) {
        logger.warn({
          msg: '[Release] Upload size limit exceeded during upload preflight, preserving temporal file without upload',
          error: uploadError,
          path,
          processName,
        });
        return { data: undefined };
      }

      if (uploadError instanceof DriveDesktopError && uploadError.cause === 'NOT_ENOUGH_SPACE') {
        logger.warn({
          msg: '[Release] Upload preflight rejected file because drive space is insufficient, preserving temporal file without upload',
          error: uploadError,
          path,
          processName,
        });

        addVirtualDriveIssue({
          error: 'UPLOAD_ERROR',
          cause: 'NOT_ENOUGH_SPACE',
          name: path.split('/').pop() ?? path,
        });

        return { error: new FuseIOError('Upload failed due to insufficient storage or network issues.') };
      }

      logger.error({ msg: '[Release] Upload failed, deleting temporal file', error: uploadError, path, processName });
      await container.get(TemporalFileDeleter).run(path);
      return { error: new FuseIOError('Upload failed due to insufficient storage or network issues.') };
    }
  } catch (err: unknown) {
    logger.error({ msg: '[Release] Unexpected error', error: err, path, processName });
    return { error: new FuseIOError('An unexpected error occurred during file release.') };
  } finally {
    clearUploadSizeLimitBlockedPath(path);
  }
}
