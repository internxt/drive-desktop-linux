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

  try {
    await rm(tempFilePath, { force: true });

    const stream = await downloadFile({
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

    await writeDownloadStreamToFile({
      stream,
      tempFilePath,
      abortController,
    });

    return { data: undefined };
  } catch (error) {
    state.lastError = error;
    await rm(tempFilePath, { force: true });
    return { error: mapDownloadError(error) };
  }
}
