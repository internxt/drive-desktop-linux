import type { RemoteSyncStatus } from '../types';

export type RemoteSyncStoreSnapshot = {
  status: RemoteSyncStatus;
  filesSyncStatus: RemoteSyncStatus;
  foldersSyncStatus: RemoteSyncStatus;
  totalFilesSynced: number;
  totalFoldersSynced: number;
  initialSyncReady: boolean;
};

export type RemoteSyncScope = {
  syncFiles: boolean;
  syncFolders: boolean;
};

export type RemoteSyncState = {
  status: RemoteSyncStatus;
  filesSyncStatus: RemoteSyncStatus;
  foldersSyncStatus: RemoteSyncStatus;
  totalFilesSynced: number;
  totalFoldersSynced: number;
  initialSyncReady: boolean;
  syncScope: RemoteSyncScope;
  statusListeners: Array<(newStatus: RemoteSyncStatus) => void>;
};

export const remoteSyncState: RemoteSyncState = {
  status: 'IDLE',
  filesSyncStatus: 'IDLE',
  foldersSyncStatus: 'IDLE',
  totalFilesSynced: 0,
  totalFoldersSynced: 0,
  initialSyncReady: false,
  syncScope: { syncFiles: true, syncFolders: true },
  statusListeners: [],
};
