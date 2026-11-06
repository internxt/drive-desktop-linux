import { FlatFolderZip } from '../../../apps/main/network/zip.service';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { components } from '../../../infra/schemas';
import { fetchFolder } from '../../../infra/drive-server/services/folder/services/fetch-folder';
import { fetchFolderTotalSizeBytes } from '../../../infra/drive-server/services/folder/services/fetch-folder-total-size-bytes';
import { convertToWritableStream } from './stream';
import { createBackupZipProgressEmitter } from './build-backup-zip-progress';
import { addRemoteBackupFileToZip } from './add-remote-backup-file-to-zip';

type FolderDto = components['schemas']['FolderDto'];
type FileDto = components['schemas']['FileDto'];

type ZipQueueItem = {
  folderUuid: string;
  folderZipPath: string;
};

type FetchFolderContent = typeof fetchFolder;

type Deps = {
  fetchFolderContent: FetchFolderContent;
  fetchTotalSize: typeof fetchFolderTotalSizeBytes;
};

type Props = {
  deviceName: string;
  networkApiUrl: string;
  rootFolderUuid: string;
  destination: ReturnType<typeof convertToWritableStream>;
  tempFolderPath: string;
  bridgeUser: string;
  bridgePass: string;
  encryptionKey: string;
  abortController?: AbortController;
  updateProgress?: (ratio: number) => void;
  deps?: Deps;
};

function isExistingFolderEntry(entry: Pick<FolderDto, 'status' | 'deleted' | 'removed'>) {
  return entry.status === 'EXISTS' && !entry.deleted && !entry.removed;
}

function isExistingFileEntry(entry: Pick<FileDto, 'status'>) {
  return entry.status === 'EXISTS';
}

export async function buildBackupZipFromRemoteContent({
  deviceName,
  networkApiUrl,
  rootFolderUuid,
  destination,
  tempFolderPath,
  bridgeUser,
  bridgePass,
  encryptionKey,
  abortController,
  updateProgress,
  deps,
}: Props) {
  const fetchContent = deps?.fetchFolderContent ?? fetchFolder;
  const fetchTotalSize = deps?.fetchTotalSize ?? fetchFolderTotalSizeBytes;

  const sizeResult = await fetchTotalSize(rootFolderUuid);
  if (sizeResult.error) {
    throw logger.error({
      tag: 'BACKUPS',
      msg: 'Failed to fetch backup folder size for zip progress',
      error: sizeResult.error,
    });
  }

  const progress = createBackupZipProgressEmitter({
    totalSizeBytes: sizeResult.data,
    updateProgress,
  });

  const zip = new FlatFolderZip(destination, {
    abortController,
    progress: (loadedBytes) => {
      progress.onZipCompressorProgress(loadedBytes);
    },
  });

  const queue: ZipQueueItem[] = [{ folderUuid: rootFolderUuid, folderZipPath: deviceName }];

  while (queue.length > 0 && !abortController?.signal.aborted) {
    const current = queue.shift();
    if (!current) break;

    const { folderUuid, folderZipPath } = current;

    zip.addFolder(folderZipPath);

    const folderResponse = await fetchContent(folderUuid);
    if (folderResponse.error) {
      throw logger.error({
        tag: 'BACKUPS',
        msg: 'Failed to fetch folder content for backup zip',
        error: folderResponse.error,
        folderUuid,
      });
    }

    const { files, children } = folderResponse.data;

    for (const file of files.filter(isExistingFileEntry)) {
      if (abortController?.signal.aborted) {
        throw new Error('Download cancelled');
      }

      await addRemoteBackupFileToZip({
        file,
        folderZipPath,
        zip,
        tempFolderPath,
        networkApiUrl,
        bridgeUser,
        bridgePass,
        encryptionKey,
        abortController,
        onFileDownloadProgress: (fileId, readBytes) => {
          progress.setFileDownloadProgress(fileId, readBytes);
        },
        onAfterFileAttempt: (clearedStorageFileId) => {
          if (clearedStorageFileId) {
            progress.clearFileDownloadProgress(clearedStorageFileId);
          } else {
            progress.emit();
          }
        },
      });
    }

    for (const child of children.filter(isExistingFolderEntry)) {
      queue.push({
        folderUuid: child.uuid,
        folderZipPath: `${folderZipPath}/${child.plainName}`,
      });
    }
  }

  if (abortController?.signal.aborted) {
    throw new Error('Download cancelled');
  }

  return await zip.close();
}
