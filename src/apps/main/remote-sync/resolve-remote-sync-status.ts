import { RemoteSyncStatus } from './helpers';

type Pops = {
  filesSyncStatus: RemoteSyncStatus;
  foldersSyncStatus: RemoteSyncStatus;
  syncFiles: boolean;
  syncFolders: boolean;
};

export function resolveRemoteSyncStatus({
  filesSyncStatus,
  foldersSyncStatus,
  syncFiles,
  syncFolders,
}: Pops) {
  if (syncFiles && !syncFolders && filesSyncStatus === 'SYNCED') {
    return 'SYNCED' as const;
  }

  if (!syncFiles && syncFolders && foldersSyncStatus === 'SYNCED') {
    return 'SYNCED' as const;
  }

  if (foldersSyncStatus === 'SYNCED' && filesSyncStatus === 'SYNCED') {
    return 'SYNCED' as const;
  }

  if (foldersSyncStatus === 'SYNC_FAILED' || filesSyncStatus === 'SYNC_FAILED') {
    return 'SYNC_FAILED' as const;
  }

  return undefined;
}