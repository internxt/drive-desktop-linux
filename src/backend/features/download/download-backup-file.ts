import { createReadStream } from 'node:fs';
import { rm } from 'node:fs/promises';
import { join } from 'node:path';
import { convertToReadableStream } from '../../../apps/main/network/NetworkFacade';
import { downloadBackupFileToTemp } from './download-backup-file-to-temp';
import { AddBackupFileToZipProps } from './download.types';

export async function addBackupFileToZip({
  file,
  zip,
  tempFolderPath,
  networkApiUrl,
  bridgeUser,
  bridgePass,
  encryptionKey,
  abortController,
  onDownloadProgress,
}: AddBackupFileToZipProps) {
  const tempFilePath = join(tempFolderPath, file.fileId);

  await downloadBackupFileToTemp({
    file,
    tempFolderPath,
    networkApiUrl,
    bridgeUser,
    bridgePass,
    encryptionKey,
    abortController,
    onDownloadProgress,
  });

  try {
    await zip.addFile(file.zipPath, convertToReadableStream(createReadStream(tempFilePath)));
  } finally {
    await rm(tempFilePath, { force: true });
  }
}
