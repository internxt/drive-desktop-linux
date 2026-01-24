import { Environment } from '@internxt/inxt-js';
import { LocalFile } from '../../../../context/local/localFile/domain/LocalFile';
import { RemoteTree } from '../../../../context/virtual-drive/remoteTree/domain/RemoteTree';
import { DriveDesktopError } from '../../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../../context/shared/domain/Result';
import { relative } from '../../../../apps/backups/utils/relative';
import { isFatalError } from '../../../../shared/issues/SyncErrorCause';
import { backupErrorsTracker } from '..';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { executeWorkerPool } from '../../../common/upload-with-worker-pool/execute-worker-pool';
import { TaskExecutor } from '../../../common/upload-with-worker-pool/types';
import { uploadFileWithRetry } from './upload-file-with-retry';
import { BackupProgressTracker } from '../backup-progress-tracker';

const DEFAULT_CONCURRENCY = 10;

export type UploadBackupFilesParams = {
  files: LocalFile[];
  localRootPath: string;
  remoteTree: RemoteTree;
  bucket: string;
  environment: Environment;
  signal: AbortSignal;
  tracker: BackupProgressTracker;
  concurrency?: number;
};

/**
 * Creates a TaskExecutor for backup file uploads
 *
 * The executor:
 * 1. Resolves parent folder from remoteTree
 * 2. Calls uploadFileWithRetry (content upload + metadata creation)
 * 3. Adds created file to remoteTree on success
 * 4. Tracks errors in backupErrorsTracker
 * 5. Returns fatal errors to stop the pool
 */
function createBackupUploadExecutor(
  localRootPath: string,
  remoteTree: RemoteTree,
  bucket: string,
  environment: Environment,
  tracker: BackupProgressTracker,
): TaskExecutor<LocalFile> {
  return async (localFile: LocalFile, signal: AbortSignal): Promise<Result<void, DriveDesktopError>> => {
    const remotePath = relative(localRootPath, localFile.path);
    const parent = remoteTree.getParent(remotePath);

    const result = await uploadFileWithRetry({
      path: localFile.path,
      size: localFile.size,
      bucket,
      folderId: parent.id,
      folderUuid: parent.uuid,
      environment,
      signal,
    });

    // Always increment progress, whether success, skip, or non-fatal error
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

      return { data: undefined };
    }

    if (result.data !== null) {
      remoteTree.addFile(parent, result.data);
    }

    return { data: undefined };
  };
}

/**
 * Upload backup files using the worker pool
 *
 * This is the entry point that replaces FileBatchUploader.run()
 * It uploads files with N concurrent workers (default 10).
 *
 * Behavior matches FileBatchUploader:
 * - Files are uploaded to storage bucket, then metadata created in backend
 * - On success, files are added to remoteTree
 * - FILE_ALREADY_EXISTS is skipped silently
 * - BAD_RESPONSE and other non-fatal errors are tracked in backupErrorsTracker
 * - Fatal errors (NOT_ENOUGH_SPACE, etc.) stop all uploads and return error
 */
export async function uploadBackupFiles({
  files,
  localRootPath,
  remoteTree,
  bucket,
  environment,
  signal,
  tracker,
  concurrency = DEFAULT_CONCURRENCY,
}: UploadBackupFilesParams): Promise<Result<void, DriveDesktopError>> {
  if (files.length === 0) {
    return { data: undefined };
  }

  const executor = createBackupUploadExecutor(localRootPath, remoteTree, bucket, environment, tracker);

  const result = await executeWorkerPool(files, executor, { concurrency, signal });

  if (result.error) {
    return { error: result.error };
  }

  return { data: undefined };
}
