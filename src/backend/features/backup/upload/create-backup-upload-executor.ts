import { Environment } from '@internxt/inxt-js';
import { RemoteTree } from '../../../../context/virtual-drive/remoteTree/domain/RemoteTree';
import { BackupProgressTracker } from '../backup-progress-tracker';
import { LocalFile } from '../../../../context/local/localFile/domain/LocalFile';
import { Result } from '../../../../context/shared/domain/Result';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { relative } from '../../../../apps/backups/utils/relative';
import { uploadFileToBackup } from './upload-file-to-backup';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { isFatalError } from '../../../../shared/issues/SyncErrorCause';
import { TaskExecutor } from '../../../common/async-queue/types';
import { backupErrorsTracker } from '..';

export function createBackupUploadExecutor(
  localRootPath: string,
  remoteTree: RemoteTree,
  bucket: string,
  environment: Environment,
  tracker: BackupProgressTracker,
): TaskExecutor<LocalFile> {
  return async (localFile: LocalFile, signal: AbortSignal): Promise<Result<void, DriveDesktopError>> => {
    if (signal.aborted) {
      return { data: undefined };
    }
    const remotePath = relative(localRootPath, localFile.path);
    const parent = remoteTree.getParent(remotePath);

    const result = await uploadFileToBackup({
      path: localFile.path,
      size: localFile.size,
      bucket,
      folderId: parent.id,
      folderUuid: parent.uuid,
      environment,
      signal,
    });

    tracker.incrementProcessed(1);

    if (result.error) {
      logger.error({ tag: 'BACKUPS', msg: '[FILE UPLOAD FAILED]', error: result.error, path: localFile.path });

      if (isFatalError(result.error.cause)) {
        return { error: result.error };
      }

      backupErrorsTracker.add(parent.id, {
        name: localFile.nameWithExtension(),
        error: result.error.cause,
      });
    }

    if (!result.error && result.data !== null) {
      remoteTree.addFile(parent, result.data);
    }

    return { data: undefined };
  };
}
