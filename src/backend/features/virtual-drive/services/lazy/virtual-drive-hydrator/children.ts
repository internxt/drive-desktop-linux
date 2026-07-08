import type { FileDto, FolderDto } from '../../../../../../infra/drive-server/out/dto';
import { createFolderFromServerFolder } from '../../../../../../context/virtual-drive/folders/application/create/FolderCreatorFromServerFolder';
import { createFileFromServerFile } from '../../../../../../context/virtual-drive/remoteTree/application/FileCreatorFromServerFile';
import { ServerFolderStatus } from '../../../../../../context/shared/domain/ServerFolder';
import { ServerFileStatus } from '../../../../../../context/shared/domain/ServerFile';
import type { Folder } from '../../../../../../context/virtual-drive/folders/domain/Folder';
import type { FileRepository } from '../../../../../../context/virtual-drive/files/domain/FileRepository';
import type { FolderRepository } from '../../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { FileStatuses } from '../../../../../../context/virtual-drive/files/domain/FileStatus';
import { buildFileName } from './file-name';
import { joinVirtualPath } from './path';

type LocalFoldersProps = {
  folderPath: string;
  children: Array<FolderDto>;
};

type LocalFilesProps = {
  folderPath: string;
  files: Array<FileDto>;
};

export function readLocalDirectory({
  folder,
  folderRepository,
  fileRepository,
}: {
  folder: Folder;
  folderRepository: FolderRepository;
  fileRepository: FileRepository;
}) {
  return {
    folders: folderRepository
      .matchingPartial({ parentId: folder.id, status: ServerFolderStatus.EXISTS })
      .map((child) => child.name),
    files: fileRepository
      .matchingPartial({ folderId: folder.id, status: FileStatuses.EXISTS })
      .map((child) => child.nameWithExtension),
  };
}

export function getExistingFolders(children: Array<FolderDto>) {
  return children.filter(isExistingFolder);
}

export function getExistingFiles(files: Array<FileDto>) {
  return files.filter(isExistingFile);
}

export function createLocalFolders({ folderPath, children }: LocalFoldersProps) {
  return getExistingFolders(children).map((child) => {
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
      joinVirtualPath(folderPath, child.plainName),
    );
  });
}

export function createLocalFiles({ folderPath, files }: LocalFilesProps) {
  return getExistingFiles(files).map((child) => {
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
      joinVirtualPath(folderPath, buildFileName(child)),
    );
  });
}

export function toRemoteFolders(children: Array<FolderDto>) {
  return getExistingFolders(children).map((child) => toRemoteFolder(child));
}

export function toRemoteFiles(files: Array<FileDto>) {
  return getExistingFiles(files).map((child) => toRemoteFile(child));
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
