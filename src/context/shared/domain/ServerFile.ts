import type { DriveItemStatus } from './DriveItemStatus';

export { DriveItemStatus as ServerFileStatus } from './DriveItemStatus';

export type ServerFile = {
  bucket: string;
  createdAt: string;
  encrypt_version: string;
  fileId: string;
  folderUuid: string;
  modificationTime: string;
  name: string;
  size: number;
  type: string;
  updatedAt: string;
  userId: number;
  status: DriveItemStatus;
  plainName?: string;
  uuid: string;
};
