import { retryWithBackoff } from '../../../../shared/retry-with-backoff';
import { createTransientErrorHandler } from '../../../../backend/common/rate-limit/transient-error-handler';
import { DownloadBackupFileToTempProps } from './download.types';
import { runDownloadBackupFileAttempt } from './run-download-backup-file-attempt';

export async function downloadBackupFileToTemp({
  file,
  tempFolderPath,
  networkApiUrl,
  bridgeUser,
  bridgePass,
  encryptionKey,
  abortController,
  onDownloadProgress,
}: DownloadBackupFileToTempProps) {
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

  const result = await retryWithBackoff<void>(operation, onError, signal);

  if (!result.error) {
    return;
  }

  if (result.error.cause === 'ABORTED') {
    throw new Error('Download aborted');
  }

  throw state.lastError instanceof Error ? state.lastError : result.error;
}
