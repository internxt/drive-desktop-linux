import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { Result } from '../../../context/shared/domain/Result';
import { downloadFile } from './download-file';
import { mapDownloadError } from './download.errors';
import { writeDownloadStreamToFile } from './stream';
import { DownloadBackupFileAttemptProps } from './download.types';

export async function runDownloadBackupFileAttempt({
  file,
  tempFolderPath,
  networkApiUrl,
  bridgeUser,
  bridgePass,
  encryptionKey,
  abortController,
  onDownloadProgress,
  state,
}: DownloadBackupFileAttemptProps): Promise<Result<void, DriveDesktopError>> {
  const tempFilePath = join(tempFolderPath, file.fileId);

  await rm(tempFilePath, { force: true });

  const result = await downloadFile({
    networkApiUrl,
    bucketId: file.bucketId,
    fileId: file.fileId,
    creds: {
      pass: bridgePass,
      user: bridgeUser,
    },
    mnemonic: encryptionKey,
    options: {
      notifyProgress: (_, readBytes) => onDownloadProgress(readBytes),
      abortController,
    },
  });

  if (result.error) {
    state.lastError = result.error;
    await rm(tempFilePath, { force: true });
    return { error: mapDownloadError(result.error) };
  }

  await writeDownloadStreamToFile({
    stream: result.data,
    tempFilePath,
    abortController,
  });

  return { data: undefined };
}
