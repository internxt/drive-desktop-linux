import { FlatFolderZip } from '../zip.service';
import { items } from '@internxt/lib';
import { PathLike } from 'node:fs';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getBackupFolderTreeSnapshot } from '../../../../backend/features/backup/get-backup-folder-tree-snapshot';
import { FolderTree } from '@internxt/sdk/dist/drive/storage/types';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { convertToWritableStream, createEmptyReadableStream, isEmptyBackupFileWithoutFileId } from './stream';
import { addBackupFileToZip } from './download-backup-file';
import { BackupFileForZip } from './download.types';

export { buildProgressStream, getDecryptedStream } from './stream';
export type { DownloadProgressCallback, IDownloadParams } from './download.types';

export async function downloadFolderAsZip(
  deviceName: string,
  networkApiUrl: string,
  folderUuid: string,
  fullPath: PathLike,
  environment: {
    bridgeUser: string;
    bridgePass: string;
    encryptionKey: string;
  },
  opts: {
    abortController?: AbortController;
    updateProgress?: (progress: number) => void;
  },
) {
  const outputFileHandle = await open(fullPath, 'w');
  const writeStream = outputFileHandle.createWriteStream();
  const destination = convertToWritableStream({ writeStream });

  const { abortController, updateProgress } = opts;
  const { bridgeUser, bridgePass, encryptionKey } = environment;
  const { data, error } = await getBackupFolderTreeSnapshot({ folderUuid });
  if (error) {
    throw logger.error({ tag: 'BACKUPS', msg: 'Error fetching backup folder tree snapshot', error });
  }

  const { tree, folderDecryptedNames, fileDecryptedNames, size } = data;
  tree.plainName = deviceName;
  folderDecryptedNames[tree.id] = deviceName;
  const pendingFolders: { path: string; data: FolderTree }[] = [{ path: '', data: tree }];
  const tempFolderPath = await mkdtemp(join(tmpdir(), 'internxt-backup-download-'));
  const inFlightDownloadedBytesByFileId = new Map<string, number>();
  let zippedBytes = 0;

  function emitProgress() {
    const inFlightDownloadedBytes = Array.from(inFlightDownloadedBytesByFileId.values()).reduce(
      (total, current) => total + current,
      0,
    );
    const usedBytes = Math.max(zippedBytes, inFlightDownloadedBytes);

    if (size <= 0) {
      updateProgress?.(0);
      return;
    }

    updateProgress?.(Math.min(usedBytes / size, 1));
  }

  const zip = new FlatFolderZip(destination, {
    abortController: opts.abortController,
    progress: (loadedBytes) => {
      zippedBytes = loadedBytes;
      emitProgress();
    },
  });

  try {
    while (pendingFolders.length > 0 && !abortController?.signal.aborted) {
      const currentFolder = pendingFolders.shift() as {
        path: string;
        data: FolderTree;
      };
      const folderPath =
        currentFolder.path + (currentFolder.path === '' ? '' : '/') + folderDecryptedNames[currentFolder.data.id];

      zip.addFolder(folderPath);

      const { files, children: folders } = currentFolder.data;

      for (const file of files) {
        if (abortController?.signal.aborted) {
          throw new Error('Download cancelled');
        }

        const displayFilename = items.getItemDisplayName({
          name: fileDecryptedNames[file.id],
          type: file.type,
        });

        if (isEmptyBackupFileWithoutFileId(file)) {
          logger.warn({
            tag: 'BACKUPS',
            msg: 'Skipping remote fetch for empty backup file without fileId',
            fileId: file.fileId,
            bucketId: file.bucket,
            fileName: displayFilename,
          });

          await zip.addFile(`${folderPath}/${displayFilename}`, createEmptyReadableStream());
          continue;
        }

        const backupFile: BackupFileForZip = {
          zipPath: `${folderPath}/${displayFilename}`,
          bucketId: file.bucket,
          fileId: file.fileId ?? '',
        };

        try {
          await addBackupFileToZip({
            file: backupFile,
            zip,
            tempFolderPath,
            networkApiUrl,
            bridgeUser,
            bridgePass,
            encryptionKey,
            abortController: opts.abortController,
            onDownloadProgress: (readBytes) => {
              inFlightDownloadedBytesByFileId.set(backupFile.fileId, readBytes);
              emitProgress();
            },
          });

          inFlightDownloadedBytesByFileId.delete(backupFile.fileId);
          emitProgress();
        } catch (error) {
          inFlightDownloadedBytesByFileId.delete(backupFile.fileId);
          emitProgress();
          throw error;
        }
      }

      pendingFolders.push(...folders.map((tree) => ({ path: folderPath, data: tree })));
    }

    if (abortController?.signal.aborted) {
      throw new Error('Download cancelled');
    }

    return zip.close();
  } finally {
    await outputFileHandle.close().catch(() => undefined);
    await rm(tempFolderPath, { recursive: true, force: true });
  }
}
