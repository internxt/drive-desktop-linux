import type { DriveItemStatus } from './DriveItemStatus';

export { DriveItemStatus as ServerFolderStatus } from './DriveItemStatus';

export type ServerFolder = {
  bucket: string | null;
  createdAt: string;
  name: string;
  parentUuid?: string | null;
  updatedAt: string;
  plain_name: string | null;
  status: DriveItemStatus;
  uuid: string;
};
