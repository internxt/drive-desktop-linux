import { logger } from '@internxt/drive-desktop-core/build/backend';
import { fetchFolder } from '../../../../../../infra/drive-server/services/folder/services/fetch-folder';
import { createOrUpdateFolderByBatch } from '../../../../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { createOrUpdateFileByBatch } from '../../../../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { FolderNotFoundError } from '../../../../../../context/virtual-drive/folders/domain/errors/FolderNotFoundError';
import { FuseCodes } from '../../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../../apps/drive/fuse/callbacks/FuseErrors';
import type { Folder } from '../../../../../../context/virtual-drive/folders/domain/Folder';
import type { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import type { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import type { DirectoryStateSqliteRepository } from '../DirectoryStateSqliteRepository';
import type { HydratorStatusScope } from './types';
import { createLocalFiles, createLocalFolders, toRemoteFiles, toRemoteFolders } from './children';

type Props = {
  folder: Folder;
  statusScope: HydratorStatusScope;
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
  directoryStateRepository: DirectoryStateSqliteRepository;
};

export async function fetchAndStoreChildren({
  folder,
  statusScope,
  folderRepository,
  fileRepository,
  directoryStateRepository,
}: Props) {
  try {
    const { data, error } = await fetchFolder(folder.uuid);

    if (error || !data) {
      throw error ?? new FolderNotFoundError(folder.path);
    }

    const remoteFolders = toRemoteFolders(data.children);
    const remoteFiles = toRemoteFiles(data.files);

    await createOrUpdateFolderByBatch({ folders: remoteFolders });
    await createOrUpdateFileByBatch({ files: remoteFiles });

    await folderRepository.deleteMatchingPartial({ parentId: folder.id });
    await fileRepository.deleteMatchingPartial({ folderId: folder.id });

    const localFolders = createLocalFolders({ folderPath: folder.path, children: data.children });
    const localFiles = createLocalFiles({ folderPath: folder.path, files: data.files });

    await Promise.all([
      ...localFolders.map((child) => folderRepository.add(child)),
      ...localFiles.map((child) => fileRepository.upsert(child)),
    ]);

    await directoryStateRepository.markLoaded({ folderId: folder.id, statusScope });
  } catch (error) {
    await directoryStateRepository.markError({ folderId: folder.id, statusScope });
    logger.error({ msg: '[FUSE - Lazy] Failed to fetch folder children', error, path: folder.path });
    throw new FuseError(FuseCodes.EIO, `[FUSE - Lazy] Unable to hydrate path: ${folder.path}`);
  }
}
