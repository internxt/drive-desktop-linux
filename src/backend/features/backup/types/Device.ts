import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';

export type Device = {
  uuid: string;
  name: string;
  bucket: string;
  status: DriveItemStatus;
  hasBackups: boolean;
};
