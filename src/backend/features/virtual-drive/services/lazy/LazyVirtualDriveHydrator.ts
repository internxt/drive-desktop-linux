import path from 'node:path';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { fetchFolder } from '../../../../../infra/drive-server/services/folder/services/fetch-folder';
import { FolderDto, FileDto } from '../../../../../infra/drive-server/out/dto';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { FolderNotFoundError } from '../../../../../context/virtual-drive/folders/domain/errors/FolderNotFoundError';
import { createFolderFromServerFolder } from '../../../../../context/virtual-drive/folders/application/create/FolderCreatorFromServerFolder';
import { createFileFromServerFile } from '../../../../../context/virtual-drive/remoteTree/application/FileCreatorFromServerFile';
import { ServerFolderStatus } from '../../../../../context/shared/domain/ServerFolder';
import { ServerFileStatus } from '../../../../../context/shared/domain/ServerFile';
import { createOrUpdateFolderByBatch } from '../../../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { createOrUpdateFileByBatch } from '../../../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { DirectoryStateSqliteRepository, DirectoryStatusScope } from './DirectoryStateSqliteRepository';
import { FuseCodes } from '../../../../../apps/drive/fuse/callbacks/FuseCodes';
import { FuseError } from '../../../../../apps/drive/fuse/callbacks/FuseErrors';

type ReadDirectoryProps = {
  path: string;
};

type EnsurePathLoadedProps = {
  path: string;
};

type DirectoryEntries = {
  files: string[];
  folders: string[];
};

type Props = {
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
  directoryStateRepository: DirectoryStateSqliteRepository;
};

export const LazyVirtualDriveHydrator = Symbol('LazyVirtualDriveHydrator');

export type LazyVirtualDriveHydrator = ReturnType<typeof createLazyVirtualDriveHydrator>;

export function createLazyVirtualDriveHydrator({
  folderRepository,
  fileRepository,
  directoryStateRepository,
}: Props) {
  const inflight = new Map<string, Promise<void>>();

  async function readDirectory({ path: requestedPath }: ReadDirectoryProps) {
    const normalizedPath = normalizePath(requestedPath);
    const statusScope: DirectoryStatusScope = 'EXISTS';
    const folder = await ensureFolderMaterialized({ path: normalizedPath, statusScope });

    await refreshChildrenIfNeeded({ folder, statusScope });

    return readLocalDirectory({ folder, statusScope });
  }

  async function ensurePathLoaded({ path: requestedPath }: EnsurePathLoadedProps) {
    const normalizedPath = normalizePath(requestedPath);
    const statusScope: DirectoryStatusScope = 'EXISTS';
    const parentPath = isRootPath(normalizedPath) ? normalizedPath : path.posix.dirname(normalizedPath);

    await ensureFolderMaterialized({ path: parentPath, statusScope });
  }

  async function ensureFolderMaterialized({
    path: requestedPath,
    statusScope,
  }: {
    path: string;
    statusScope: DirectoryStatusScope;
  }): Promise<Folder> {
    const root = await resolveRootFolder();

    if (isRootPath(requestedPath)) {
      return root;
    }

    let currentFolder = root;
    let currentPath = '';

    for (const segment of requestedPath.split('/').filter(Boolean)) {
      currentPath = `${currentPath}/${segment}`;

      const existing = folderRepository.matchingPartial({ path: currentPath })[0];
      if (existing) {
        currentFolder = existing;
        continue;
      }

      await refreshChildrenIfNeeded({ folder: currentFolder, statusScope });

      const hydrated = folderRepository.matchingPartial({ path: currentPath })[0];
      if (!hydrated) {
        throw new FuseError(FuseCodes.ENOENT, `[FUSE - Lazy] Folder not found: ${currentPath}`);
      }

      currentFolder = hydrated;
    }

    return currentFolder;
  }

  async function refreshChildrenIfNeeded({
    folder,
    statusScope,
  }: {
    folder: Folder;
    statusScope: DirectoryStatusScope;
  }) {
    const cacheKey = `${folder.id}:${statusScope}`;
    if (await directoryStateRepository.isFresh({ folderId: folder.id, statusScope })) {
      return;
    }

    const inFlight = inflight.get(cacheKey);
    if (inFlight) {
      return inFlight;
    }

    const task = fetchAndStoreChildren({ folder, statusScope }).finally(() => {
      inflight.delete(cacheKey);
    });

    inflight.set(cacheKey, task);

    return task;
  }

  async function fetchAndStoreChildren({
    folder,
    statusScope,
  }: {
    folder: Folder;
    statusScope: DirectoryStatusScope;
  }) {
    try {
      const { data, error } = await fetchFolder(folder.uuid);

      if (error || !data) {
        throw error ?? new FolderNotFoundError(folder.path);
      }

      const remoteFolders = data.children.filter(isExistingFolder).map((child) => toRemoteFolder(child));
      const remoteFiles = data.files.filter(isExistingFile).map((child) => toRemoteFile(child));

      // SQLite (better-sqlite3) uses a single writer connection.
      // Running both batch transactions in parallel causes nested transaction errors.
      await createOrUpdateFolderByBatch({ folders: remoteFolders });
      await createOrUpdateFileByBatch({ files: remoteFiles });
      await folderRepository.deleteMatchingPartial({ parentId: folder.id });
      await fileRepository.deleteMatchingPartial({ folderId: folder.id });

      const localFolders = data.children.filter(isExistingFolder).map((child) => {
        return createFolderFromServerFolder(
          {
            bucket: child.bucket ?? null,
            createdAt: child.createdAt,
            id: child.id,
            name: child.name,
            parentId: child.parentId,
            updatedAt: child.updatedAt,
            plain_name: child.plainName,
            status: ServerFolderStatus.EXISTS,
            uuid: child.uuid,
          },
          joinVirtualPath(folder.path, child.plainName),
        );
      });

      const localFiles = data.files.filter(isExistingFile).map((child) => {
        return createFileFromServerFile(
          {
            bucket: child.bucket,
            createdAt: child.createdAt,
            encrypt_version: child.encryptVersion,
            fileId: child.fileId ?? '',
            folderId: child.folderId,
            id: child.id,
            modificationTime: child.modificationTime ?? child.updatedAt,
            name: child.name,
            size: Number.parseInt(String(child.size), 10),
            type: child.type,
            updatedAt: child.updatedAt,
            userId: child.userId,
            status: ServerFileStatus.EXISTS,
            plainName: child.plainName,
            uuid: child.uuid,
          },
          joinVirtualPath(folder.path, buildFileName(child)),
        );
      });

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

  async function resolveRootFolder() {
    const root = folderRepository.matchingPartial({ path: '/' })[0];

    if (!root) {
      throw new FuseError(FuseCodes.EIO, '[FUSE - Lazy] Root folder not initialized');
    }

    return root;
  }

  function readLocalDirectory({
    folder,
    statusScope,
  }: {
    folder: Folder;
    statusScope: DirectoryStatusScope;
  }): DirectoryEntries {
    return {
      folders: folderRepository
        .matchingPartial({ parentId: folder.id, status: ServerFolderStatus.EXISTS })
        .map((child) => child.name),
      files: fileRepository
        .matchingPartial({ folderId: folder.id, status: ServerFileStatus.EXISTS })
        .map((child) => child.nameWithExtension),
    };
  }

  return {
    readDirectory,
    ensurePathLoaded,
  };
}

function normalizePath(pathToNormalize: string) {
  const normalized = path.posix.normalize(pathToNormalize || '/');

  if (normalized === '.') {
    return '/';
  }

  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function isRootPath(pathToCheck: string) {
  return pathToCheck === '/' || pathToCheck === '';
}

function joinVirtualPath(parentPath: string, name: string) {
  return `${parentPath}/${name}`.replaceAll('//', '/');
}

function buildFileName(file: FileDto) {
  return file.type ? `${file.plainName}.${file.type}` : file.plainName;
}

function isExistingFolder(folder: FolderDto) {
  return folder.status === 'EXISTS' && !folder.deleted && !folder.removed;
}

function isExistingFile(file: FileDto) {
  return file.status === 'EXISTS';
}

function toRemoteFolder(folder: FolderDto) {
  return {
    type: folder.type,
    id: folder.id,
    parentId: folder.parentId,
    bucket: folder.bucket,
    userId: folder.userId,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    uuid: folder.uuid,
    plainName: folder.plainName,
    name: folder.name,
    status: folder.status,
  };
}

function toRemoteFile(file: FileDto) {
  return {
    id: file.id,
    uuid: file.uuid,
    fileId: file.fileId ?? '',
    type: file.type,
    size: Number.parseInt(String(file.size), 10),
    bucket: file.bucket,
    folderId: file.folderId,
    folderUuid: file.folderUuid,
    userId: file.userId,
    modificationTime: file.modificationTime ?? file.updatedAt,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    plainName: file.plainName,
    name: file.name,
    status: file.status,
  };
}
