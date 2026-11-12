import type { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';

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
