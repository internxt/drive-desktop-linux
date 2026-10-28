import type { DriveItemStatus } from './DriveItemStatus';

export { DriveItemStatus as ServerFolderStatus } from './DriveItemStatus';

export type ServerFolder = {
  bucket: string | null;
  createdAt: string;
  id: number;
  name: string;
  parentId: null | number;
  updatedAt: string;
  plain_name: string | null;
  status: DriveItemStatus;
  uuid: string;
};
