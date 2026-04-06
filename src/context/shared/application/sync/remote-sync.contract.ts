export type RemoteSyncFileDto = {
  bucket: string;
  createdAt: string;
  fileId: string;
  folderId: number;
  id: number;
  modificationTime: string;
  name: string;
  plainName: string;
  size: number;
  type: string | null;
  updatedAt: string;
  userId: number;
  status: string;
  uuid: string;
};

export type RemoteSyncFolderDto = {
  bucket: string | null;
  createdAt: string;
  id: number;
  name: string;
  parentId: number | null;
  updatedAt: string;
  plainName: string | null;
  status: string;
  uuid: string;
};

export type UpdatedRemoteItemsDto = {
  files: RemoteSyncFileDto[];
  folders: RemoteSyncFolderDto[];
};
