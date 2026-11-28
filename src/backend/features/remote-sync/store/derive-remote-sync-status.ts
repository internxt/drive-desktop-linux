import type { RemoteSyncStatus } from '../types';

type Props = {
  filesSyncStatus: RemoteSyncStatus;
  foldersSyncStatus: RemoteSyncStatus;
  syncFiles: boolean;
  syncFolders: boolean;
};

export function deriveRemoteSyncStatus({ filesSyncStatus, foldersSyncStatus, syncFiles, syncFolders }: Props) {
  if (syncFiles && !syncFolders && filesSyncStatus === 'SYNCED') {
    return 'SYNCED';
  }

  if (!syncFiles && syncFolders && foldersSyncStatus === 'SYNCED') {
    return 'SYNCED';
  }

  if (foldersSyncStatus === 'SYNCED' && filesSyncStatus === 'SYNCED') {
    return 'SYNCED';
  }

  if (foldersSyncStatus === 'SYNC_FAILED' || filesSyncStatus === 'SYNC_FAILED') {
    return 'SYNC_FAILED';
  }

  return null;
}
