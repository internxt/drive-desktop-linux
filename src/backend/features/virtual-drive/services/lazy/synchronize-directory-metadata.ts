import path from 'node:path';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
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
import { isVirtualTrashFolder } from '../drive-folder/seed-virtual-drive-root-folders';
import { DirectoryStateRepository } from './directory-state-sqlite-repository';
import { toRemoteFile, toRemoteFolder } from './remote-synced-mappers';

type Props = {
  folder: Folder;
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
};

export async function synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository }: Props) {
  try {
    const response = await fetchFolder(folder.uuid);

    if (response.error) {
      throw response.error;
    }

    const remoteFolders = response.data.children.filter(isExistingFolder).map(toRemoteFolder);
    const remoteFiles = response.data.files.filter(isExistingFile).map(toRemoteFile);

    // better-sqlite3 has one writer connection, so these batches must remain sequential.
    const folderPersistence = await createOrUpdateFolderByBatch({ folders: remoteFolders });
    if (folderPersistence.error) throw folderPersistence.error;

    const filePersistence = await createOrUpdateFileByBatch({ files: remoteFiles });
    if (filePersistence.error) throw filePersistence.error;

    await removeStaleChildren({ folder, folderRepository, fileRepository });

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
    await DirectoryStateRepository.markError({ folderId: folder.id, statusScope: 'EXISTS' });
    logger.error({ msg: '[FUSE - Metadata sync] Failed to synchronize directory metadata', error, path: folder.path });
    const code = error instanceof DriveServerError && error.cause === 'NOT_FOUND' ? FuseCodes.ENOENT : FuseCodes.EIO;
    throw new FuseError(code, `[FUSE - Metadata sync] Unable to synchronize directory metadata: ${folder.path}`);
  }
}

async function removeStaleChildren({
  folder,
  folderRepository,
  fileRepository,
}: {
  folder: Folder;
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
}) {
  const childPathPrefix = `${folder.path.replace(/\/$/, '')}/`;
  const staleFolders = folderRepository
    .searchByPathPrefix(childPathPrefix)
    .filter((staleFolder) => staleFolder.id !== folder.id && !isVirtualTrashFolder(staleFolder))
    .sort((left, right) => right.path.length - left.path.length);

  await Promise.all([
    ...staleFolders.map(async (staleFolder) => {
      await DirectoryStateRepository.invalidate({ folderId: staleFolder.id, statusScope: 'EXISTS' });
      await folderRepository.delete(staleFolder.id);
    }),
    fileRepository.deleteByFolderPath(folder.path),
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
