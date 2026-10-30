import type { DriveItemStatus } from '../../../context/shared/domain/DriveItemStatus';

export const SIX_HOURS_IN_MILLISECONDS = 6 * 60 * 60 * 1000;

export type RemoteSyncedFile = {
  uuid: string;
  fileId: string;
  type: string;
  size: number;
  bucket: string;
  folderUuid: string;
  userId: number;
  modificationTime: string;
  createdAt: string;
  updatedAt: string;
  plainName: string;
  status: DriveItemStatus;
};

export type RemoteSyncedFolder = {
  type: string;
  bucket: string | null;
  userId: number;
  createdAt: string;
  updatedAt: string;
  uuid: string;
  plainName: string;
  parentUuid?: string;
  status: DriveItemStatus;
};

export type RemoteSyncStatus = 'IDLE' | 'SYNCED' | 'SYNCING' | 'SYNC_FAILED';
export type SyncConfig = {
  retry: number;
  maxRetries: number;
};

export function rewind(original: Date, milliseconds: number): Date {
  const shallowCopy = new Date(original.getTime());

  shallowCopy.setTime(shallowCopy.getTime() - milliseconds);

  return shallowCopy;
}
