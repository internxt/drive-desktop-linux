import { retryWithBackoff } from '../../../shared/retry-with-backoff';
import { createTransientErrorHandler } from '../../common/rate-limit/transient-error-handler';
import { DownloadBackupFileToTempProps } from './download.types';
import { runDownloadBackupFileAttempt } from './run-download-backup-file-attempt';
import { Result } from '../../../context/shared/domain/Result';

export async function downloadBackupFileToTemp({
  file,
  tempFolderPath,
  networkApiUrl,
  bridgeUser,
  bridgePass,
  encryptionKey,
  abortController,
  onDownloadProgress,
}: DownloadBackupFileToTempProps): Promise<Result<void, Error>> {
  const signal = abortController?.signal ?? new AbortController().signal;
  const state: { lastError?: unknown } = {};
  const onError = createTransientErrorHandler({
    tag: 'BACKUPS',
    context: 'BACKUP FILE TEMP RETRY',
    path: `${file.bucketId}/${file.fileId}`,
  });
  const operation = runDownloadBackupFileAttempt.bind(null, {
    file,
    tempFolderPath,
    networkApiUrl,
    bridgeUser,
    bridgePass,
    encryptionKey,
    abortController,
    onDownloadProgress,
    state,
  });

  return await retryWithBackoff<void>(operation, onError, signal);
}
