import { Environment } from '@internxt/inxt-js';
import { BackupProgressTracker } from '../backup-progress-tracker';
import { LocalFile } from '../../../../context/local/localFile/domain/LocalFile';
import { File } from '../../../../context/virtual-drive/files/domain/File';
import { Result } from '../../../../context/shared/domain/Result';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { updateFileWithRetry } from './update-file-with-retry';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { isFatalError } from '../../../../shared/issues/SyncErrorCause';
import { TaskExecutor } from '../../../common/async-queue/types';
import { backupErrorsTracker } from '..';

export type ModifiedFilePair = [LocalFile, File];

export function createBackupUpdateExecutor(
  bucket: string,
  environment: Environment,
  tracker: BackupProgressTracker,
): TaskExecutor<ModifiedFilePair> {
  return async (
    [localFile, remoteFile]: ModifiedFilePair,
    signal: AbortSignal,
  ): Promise<Result<void, DriveDesktopError>> => {
    const result = await updateFileWithRetry({
      path: localFile.path,
      size: localFile.size,
      bucket,
      fileUuid: remoteFile.uuid,
      environment,
      signal,
    });

    tracker.incrementProcessed(1);

    if (result.error) {
      logger.error({ tag: 'BACKUPS', msg: '[FILE UPDATE FAILED]', error: result.error, path: localFile.path });

      if (isFatalError(result.error.cause)) {
        return { error: result.error };
      }

      backupErrorsTracker.add(remoteFile.folderId, {
        name: localFile.nameWithExtension(),
        error: result.error.cause,
      });

      return { data: undefined };
    }

    return { data: undefined };
  };
}
