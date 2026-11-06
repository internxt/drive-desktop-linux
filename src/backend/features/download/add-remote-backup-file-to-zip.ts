import { items } from '@internxt/lib';
import { FlatFolderZip } from '../../../apps/main/network/zip.service';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { components } from '../../../infra/schemas';
import { createEmptyReadableStream, isEmptyBackupFileWithoutFileId } from './stream';
import { addBackupFileToZip } from './download-backup-file';
import { BackupFileForZip } from './download.types';

type FileDto = components['schemas']['FileDto'];

type Props = {
  file: FileDto;
  folderZipPath: string;
  zip: FlatFolderZip;
  tempFolderPath: string;
  networkApiUrl: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  abortController?: AbortController;
  onFileDownloadProgress: (fileId: string, readBytes: number) => void;
  /** Called after each file handling; pass storageFileId when a download map entry should be cleared */
  onAfterFileAttempt: (clearedStorageFileId?: string) => void;
};

export async function addRemoteBackupFileToZip({
  file,
  folderZipPath,
  zip,
  tempFolderPath,
  networkApiUrl,
  bridgeUser,
  bridgePass,
  encryptionKey,
  abortController,
  onFileDownloadProgress,
  onAfterFileAttempt,
}: Props) {
  const displayFilename = items.getItemDisplayName({
    name: file.plainName,
    type: file.type ?? '',
  });

  const fileSize = Number.parseInt(file.size, 10) || 0;
  const storageFileId = file.fileId?.trim() ?? '';

  if (isEmptyBackupFileWithoutFileId({ size: fileSize, fileId: storageFileId || null })) {
    logger.warn({
      tag: 'BACKUPS',
      msg: 'Skipping remote fetch for empty backup file without fileId',
      fileId: file.fileId,
      bucketId: file.bucket,
      fileName: displayFilename,
    });

    await zip.addFile(`${folderZipPath}/${displayFilename}`, createEmptyReadableStream());
    onAfterFileAttempt();
    return { ok: true as const };
  }

  if (!storageFileId) {
    throw logger.error({
      tag: 'BACKUPS',
      msg: 'Cannot download backup file with non-zero size and missing fileId',
      fileUuid: file.uuid,
      fileName: displayFilename,
      folderId: file.folderId,
      size: fileSize,
    });
  }

  const backupFile: BackupFileForZip = {
    zipPath: `${folderZipPath}/${displayFilename}`,
    bucketId: file.bucket,
    fileId: storageFileId,
  };

  const result = await addBackupFileToZip({
    file: backupFile,
    zip,
    tempFolderPath,
    networkApiUrl,
    bridgeUser,
    bridgePass,
    encryptionKey,
    abortController,
    onDownloadProgress: (readBytes) => {
      onFileDownloadProgress(storageFileId, readBytes);
    },
  });

  onAfterFileAttempt(storageFileId);

  if (result.error) {
    throw logger.error({
      tag: 'BACKUPS',
      msg: 'Error downloading backup file to zip',
      error: result.error,
      fileId: backupFile.fileId,
      bucketId: backupFile.bucketId,
      fileName: displayFilename,
    });
  }

  return { ok: true as const };
}
