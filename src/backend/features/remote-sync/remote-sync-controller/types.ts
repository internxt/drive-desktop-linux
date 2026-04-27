import { SyncConfig, RemoteSyncStatus } from '../helpers';
import { DatabaseCollectionAdapter } from '../../../../apps/main/database/adapters/base';
import { DriveFile } from '../../../../apps/main/database/entities/DriveFile';
import { DriveFolder } from '../../../../apps/main/database/entities/DriveFolder';
import { RemoteSyncErrorHandler } from '../remote-sync-error-handler';

export type RemoteSyncControllerConfig = {
  fetchFilesLimitPerRequest: number;
  fetchFoldersLimitPerRequest: number;
  syncFiles: boolean;
  syncFolders: boolean;
};

export type RemoteSyncControllerDb = {
  files: DatabaseCollectionAdapter<DriveFile>;
  folders: DatabaseCollectionAdapter<DriveFolder>;
};

export type CreateRemoteSyncControllerPops = {
  db: RemoteSyncControllerDb;
  config: RemoteSyncControllerConfig;
  errorHandler: RemoteSyncErrorHandler;
};

export type RemoteSyncController = {
  getTotalFilesSynced: () => number;
  onStatusChange: (callback: (newStatus: RemoteSyncStatus) => void) => void;
  getSyncStatus: () => RemoteSyncStatus;
  resetRemoteSync: () => void;
  startRemoteSync: (props: CreateRemoteSyncControllerPops) => Promise<void>;
};

export type RemoteSyncControllerState = {
  foldersSyncStatus: RemoteSyncStatus;
  filesSyncStatus: RemoteSyncStatus;
  status: RemoteSyncStatus;
  totalFilesSynced: number;
  totalFoldersSynced: number;
  onStatusChangeCallbacks: Array<(newStatus: RemoteSyncStatus) => void>;
};

export type SyncRemoteItemsPops = {
  state: RemoteSyncControllerState;
  db: RemoteSyncControllerDb;
  config: RemoteSyncControllerConfig;
  errorHandler: RemoteSyncErrorHandler;
  syncConfig: SyncConfig;
  from?: Date;
};
