import path from 'node:path';
import { Result } from '@internxt/drive-desktop-core/build/common/result';
import { RemoteSyncedFile } from '../../../../../apps/main/remote-sync/helpers';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { createFolderFromServerFolder } from '../../../../../context/virtual-drive/folders/application/create/FolderCreatorFromServerFolder';
import { createFileFromServerFile } from '../../../../../context/virtual-drive/remoteTree/application/FileCreatorFromServerFile';
import { fetchFolder } from '../../../../../infra/drive-server/services/folder/services/fetch-folder';
import { createOrUpdateFileByBatch } from '../../../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { createOrUpdateFolderByBatch } from '../../../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { mapFile } from '../../../remote-sync/map-file';
import { DirectoryStateRepository } from './directory-state-sqlite-repository';
import { recordSynchronizationFailure } from './record-synchronization-failure';
import { removeStaleChildren } from './remove-stale-children';

type Props = {
  folder: Folder;
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
};

export async function synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository }: Props) {
  let localMutationStarted = false;
  try {
    const response = await fetchFolder(folder.uuid);

    if (response.error) {
      return recordSynchronizationFailure({ folder, error: response.error, localMutationStarted });
    }

    const remoteFolders = response.data.children.filter(isExistingFolder);
    const remoteFiles = response.data.files.filter(isExistingFile).map(mapFile);

    // better-sqlite3 has one writer connection, so these batches must remain sequential.
    localMutationStarted = true;
    // A partial refresh must not leave a previous successful load eligible for fallback.
    await DirectoryStateRepository.invalidate({ folderId: folder.id, statusScope: 'EXISTS' });
    const folderPersistence = await createOrUpdateFolderByBatch({ folders: remoteFolders });
    if (folderPersistence.error) {
      return recordSynchronizationFailure({ folder, error: folderPersistence.error, localMutationStarted });
    }

    const filePersistence = await createOrUpdateFileByBatch({ files: remoteFiles });
    if (filePersistence.error) {
      return recordSynchronizationFailure({ folder, error: filePersistence.error, localMutationStarted });
    }

    await removeStaleChildren({
      folder,
      folderRepository,
      fileRepository,
      remoteFolderUuids: new Set(remoteFolders.map((child) => child.uuid)),
      remoteFileUuids: new Set(remoteFiles.map((child) => child.uuid)),
    });

    const localFolders = remoteFolders.map((remoteFolder) => {
      return createFolderFromServerFolder(remoteFolder, path.posix.join(folder.path, remoteFolder.plainName));
    });
    const localFiles = remoteFiles.map((remoteFile) => {
      return createFileFromServerFile(remoteFile, path.posix.join(folder.path, fileName(remoteFile)));
    });

    await Promise.all([
      ...localFolders.map((child) => folderRepository.add(child)),
      ...localFiles.map((child) => fileRepository.upsert(child)),
    ]);
    await DirectoryStateRepository.markLoaded({ folderId: folder.id, statusScope: 'EXISTS' });
    return Result.ok(undefined);
  } catch (error) {
    // Repository and sqlite operations still reject. Fold those failures into the same Result.
    return recordSynchronizationFailure({ folder, error, localMutationStarted });
  }
}

function isExistingFolder(folder: { status: string; deleted: boolean; removed: boolean }) {
  return folder.status === 'EXISTS' && !folder.deleted && !folder.removed;
}

function isExistingFile(file: { status: string }) {
  return file.status === 'EXISTS';
}

function fileName(file: RemoteSyncedFile) {
  return file.type ? `${file.plainName}.${file.type}` : file.plainName;
}
