import type { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';

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
