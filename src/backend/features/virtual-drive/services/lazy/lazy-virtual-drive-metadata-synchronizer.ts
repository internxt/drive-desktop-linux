import path from 'node:path';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileStatuses } from '../../../../../context/virtual-drive/files/domain/FileStatus';
import { FolderStatuses } from '../../../../../context/virtual-drive/folders/domain/FolderStatus';
import { isVirtualTrashFolder, isVirtualTrashPath } from '../drive-folder/seed-virtual-drive-root-folders';
import { DirectoryStateRepository } from './directory-state-sqlite-repository';
import { synchronizeDirectoryMetadata } from './synchronize-directory-metadata';

type Props = {
  path: string;
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
};

type DirectoryEntries = {
  folders: Array<string>;
  files: Array<string>;
};

const inFlightRefreshes = new Map<string, Promise<void>>();

async function readDirectory({
  path: requestedPath,
  folderRepository,
  fileRepository,
}: Props): Promise<DirectoryEntries> {
  const folder = await resolveFolder({ path: requestedPath, folderRepository, fileRepository });

  await synchronizeChildrenIfStale({ folder, folderRepository, fileRepository });

  return {
    folders: folderRepository
      .matchingPartial({ parentId: folder.id, status: FolderStatuses.EXISTS })
      .filter((child) => !isVirtualTrashFolder(child))
      .map((child) => child.name),
    files: fileRepository
      .matchingPartial({ folderId: folder.id, status: FileStatuses.EXISTS })
      .map((child) => child.nameWithExtension),
  };
}

async function ensurePathMetadataSynchronized({ path: requestedPath, folderRepository, fileRepository }: Props) {
  const normalizedPath = normalizePath(requestedPath);
  if (isVirtualTrashPath(normalizedPath)) {
    return;
  }
  const parentPath = normalizedPath === '/' ? '/' : path.posix.dirname(normalizedPath);
  const parentFolder = await resolveFolder({ path: parentPath, folderRepository, fileRepository });

  await synchronizeChildrenIfStale({ folder: parentFolder, folderRepository, fileRepository });
}

async function resolveFolder({ path: requestedPath, folderRepository, fileRepository }: Props): Promise<Folder> {
  const rootFolder = folderRepository.matchingPartial({ path: '/' })[0];

  if (!rootFolder) {
    throw new FuseError(FuseCodes.EIO, '[FUSE - Metadata sync] Root folder not initialized');
  }

  let currentFolder = rootFolder;
  let currentPath = '';

  for (const segment of normalizePath(requestedPath).split('/').filter(Boolean)) {
    currentPath = path.posix.join(currentPath, segment);
    const absolutePath = `/${currentPath}`;
    const existingFolder = folderRepository.matchingPartial({ path: absolutePath })[0];

    if (existingFolder) {
      currentFolder = existingFolder;
      continue;
    }

    if (isVirtualTrashPath(absolutePath)) {
      throw new FuseError(FuseCodes.ENOENT, `[FUSE - Metadata sync] Folder not found: ${absolutePath}`);
    }

    await synchronizeChildrenIfStale({ folder: currentFolder, folderRepository, fileRepository });

    const synchronizedFolder = folderRepository.matchingPartial({ path: absolutePath })[0];

    if (!synchronizedFolder) {
      throw new FuseError(FuseCodes.ENOENT, `[FUSE - Metadata sync] Folder not found: ${absolutePath}`);
    }

    currentFolder = synchronizedFolder;
  }

  return currentFolder;
}

async function synchronizeChildrenIfStale({
  folder,
  folderRepository,
  fileRepository,
}: {
  folder: Folder;
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
}) {
  if (isVirtualTrashFolder(folder)) {
    return;
  }

  const statusScope = 'EXISTS' as const;

  if (await DirectoryStateRepository.isFresh({ folderId: folder.id, statusScope })) {
    return;
  }

  const key = `${folder.id}:${statusScope}`;
  const inFlightRefresh = inFlightRefreshes.get(key);

  if (inFlightRefresh) {
    return inFlightRefresh;
  }

  const refresh = synchronizeDirectoryMetadata({ folder, folderRepository, fileRepository }).finally(() => {
    inFlightRefreshes.delete(key);
  });

  inFlightRefreshes.set(key, refresh);

  return refresh;
}

function normalizePath(requestedPath: string) {
  const normalizedPath = path.posix.normalize(requestedPath || '/');

  return normalizedPath === '.' ? '/' : normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
}

export const LazyVirtualDriveMetadataSynchronizer = {
  readDirectory,
  ensurePathMetadataSynchronized,
};
