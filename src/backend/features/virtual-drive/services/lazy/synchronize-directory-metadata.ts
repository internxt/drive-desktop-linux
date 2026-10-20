import path from 'node:path';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { RemoteSyncedFile } from '../../../../../apps/main/remote-sync/helpers';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { createFileFromServerFile } from '../../../../../context/virtual-drive/remoteTree/application/FileCreatorFromServerFile';
import { createFolderFromServerFolder } from '../../../../../context/virtual-drive/folders/application/create/FolderCreatorFromServerFolder';
import { DriveServerError } from '../../../../../infra/drive-server/drive-server.error';
import { fetchFolder } from '../../../../../infra/drive-server/services/folder/services/fetch-folder';
import { createOrUpdateFileByBatch } from '../../../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { createOrUpdateFolderByBatch } from '../../../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { DirectoryStateRepository } from './directory-state-sqlite-repository';
import { DirectoryMetadataSyncError } from './directory-metadata-sync.error';
import { toRemoteFile, toRemoteFolder } from './remote-synced-mappers';

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
      throw response.error;
    }

    const remoteFolders = response.data.children.filter(isExistingFolder).map(toRemoteFolder);
    const remoteFiles = response.data.files.filter(isExistingFile).map(toRemoteFile);

    // better-sqlite3 has one writer connection, so these batches must remain sequential.
    localMutationStarted = true;
    // A partial refresh must not leave a previous successful load eligible for fallback.
    await DirectoryStateRepository.invalidate({ folderId: folder.id, statusScope: 'EXISTS' });
    const folderPersistence = await createOrUpdateFolderByBatch({ folders: remoteFolders });
    if (folderPersistence.error) throw folderPersistence.error;

    const filePersistence = await createOrUpdateFileByBatch({ files: remoteFiles });
    if (filePersistence.error) throw filePersistence.error;

    await removeStaleChildren({
      folder,
      folderRepository,
      fileRepository,
      remoteFolderUuids: new Set(remoteFolders.map((child) => child.uuid)),
      remoteFileUuids: new Set(remoteFiles.map((child) => child.uuid)),
    });

    const localFolders = remoteFolders.map((remoteFolder) => {
      return createFolderFromServerFolder(
        remoteFolder,
        joinPath({ parentPath: folder.path, name: remoteFolder.plainName }),
      );
    });
    const localFiles = remoteFiles.map((remoteFile) => {
      return createFileFromServerFile(remoteFile, joinPath({ parentPath: folder.path, name: fileName(remoteFile) }));
    });

    await Promise.all([
      ...localFolders.map((child) => folderRepository.add(child)),
      ...localFiles.map((child) => fileRepository.upsert(child)),
    ]);
    await DirectoryStateRepository.markLoaded({ folderId: folder.id, statusScope: 'EXISTS' });
  } catch (error) {
    logger.error({ msg: '[FUSE - Metadata sync] Failed to synchronize directory metadata', error, path: folder.path });
    const code = error instanceof DriveServerError && error.cause === 'NOT_FOUND' ? FuseCodes.ENOENT : FuseCodes.EIO;
    const canUseCachedChildren = !localMutationStarted && code !== FuseCodes.ENOENT;
    await DirectoryStateRepository.markError({
      folderId: folder.id,
      statusScope: 'EXISTS',
      failureState:
        code === FuseCodes.ENOENT ? 'error_not_found' : canUseCachedChildren ? 'error_before_mutation' : 'error',
    });
    throw new DirectoryMetadataSyncError({ code, folderPath: folder.path, canUseCachedChildren });
  }
}

async function removeStaleChildren({
  folder,
  folderRepository,
  fileRepository,
  remoteFolderUuids,
  remoteFileUuids,
}: Props & {
  remoteFolderUuids: Set<string>;
  remoteFileUuids: Set<string>;
}) {
  const removedFolderChildren = folderRepository
    .matchingPartial({ parentId: folder.id })
    .filter((child) => !remoteFolderUuids.has(child.uuid));
  const staleFolders = removedFolderChildren
    .flatMap((child) => [child, ...folderRepository.searchByPathPrefix(`${child.path}/`)])
    .sort((left, right) => right.path.length - left.path.length);
  const staleFiles = fileRepository
    .matchingPartial({ folderId: folder.id })
    .filter((child) => !remoteFileUuids.has(child.uuid));

  await Promise.all([
    ...staleFolders.map(async (staleFolder) => {
      await DirectoryStateRepository.invalidate({ folderId: staleFolder.id, statusScope: 'EXISTS' });
      await folderRepository.delete(staleFolder.id);
    }),
    ...staleFiles.map((child) => fileRepository.delete(child.uuid)),
    ...removedFolderChildren.map((child) => fileRepository.deleteByFolderPath(child.path)),
  ]);
}

function isExistingFolder(folder: { status: string; deleted: boolean; removed: boolean }) {
  return folder.status === 'EXISTS' && !folder.deleted && !folder.removed;
}

function isExistingFile(file: { status: string }) {
  return file.status === 'EXISTS';
}

function joinPath({ parentPath, name }: { parentPath: string; name: string }) {
  return path.posix.join(parentPath, name);
}

function fileName(file: RemoteSyncedFile) {
  return file.type ? `${file.plainName}.${file.type}` : file.plainName;
}
