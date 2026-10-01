import { RemoteSyncedFile, RemoteSyncedFolder } from '../../../../../apps/main/remote-sync/helpers';
import { ServerFileStatus } from '../../../../../context/shared/domain/ServerFile';
import { ServerFolderStatus } from '../../../../../context/shared/domain/ServerFolder';

type RemoteFolder = {
  type: string;
  id: number;
  parentId: number;
  bucket: string;
  userId: number;
  createdAt: string;
  updatedAt: string;
  uuid: string;
  plainName: string;
  name: string;
};

type RemoteFile = {
  id: number;
  uuid: string;
  fileId: string | null;
  type: string;
  size: string;
  bucket: string;
  folderId: number;
  folderUuid: string;
  userId: number;
  modificationTime: string;
  createdAt: string;
  updatedAt: string;
  plainName: string;
  name: string;
};

export function toRemoteFolder(folder: RemoteFolder): RemoteSyncedFolder {
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
    status: ServerFolderStatus.EXISTS,
  };
}

export function toRemoteFile(file: RemoteFile): RemoteSyncedFile {
  return {
    id: file.id,
    uuid: file.uuid,
    fileId: file.fileId ?? '',
    type: file.type,
    size: Number.parseInt(file.size, 10),
    bucket: file.bucket,
    folderId: file.folderId,
    folderUuid: file.folderUuid,
    userId: file.userId,
    modificationTime: file.modificationTime,
    createdAt: file.createdAt,
    updatedAt: file.updatedAt,
    plainName: file.plainName,
    name: file.name,
    status: ServerFileStatus.EXISTS,
  };
}
