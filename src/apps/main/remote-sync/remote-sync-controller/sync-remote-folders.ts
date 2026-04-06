import { SIX_HOURS_IN_MILLISECONDS } from '../helpers';
import { createOrUpdateFolderByBatch } from '../../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { fetchRemoteFolders } from '../fetch-remote-folders';
import { getLastUpdatedCheckpoint } from '../get-last-updated-checkpoint';
import { syncRemoteItems } from '../sync-remote-items';
import { checkRemoteSyncStatus } from './check-remote-sync-status';
import { SyncRemoteItemsPops } from './types';

export async function syncRemoteFolders({
  state,
  db,
  config,
  errorHandler,
  syncConfig,
  from,
}: SyncRemoteItemsPops) {
  await syncRemoteItems({
    from,
    finishMessage: 'Remote folders sync finished',
    syncConfig,
    syncItemType: 'folders',
    getCheckpoint: () =>
      getLastUpdatedCheckpoint({
        collection: db.folders,
        rewindMilliseconds: SIX_HOURS_IN_MILLISECONDS,
      }),
    fetchRemoteItems: (updatedAtCheckpoint) =>
      fetchRemoteFolders({
        limit: config.fetchFoldersLimitPerRequest,
        updatedAtCheckpoint,
      }),
    persistRemoteItems: (items) => createOrUpdateFolderByBatch({ folders: items }),
    onSyncFailed: () => {
      state.foldersSyncStatus = 'SYNC_FAILED';
    },
    onSyncFinished: () => {
      state.foldersSyncStatus = 'SYNCED';
    },
    onSyncProgress: (items) => {
      state.totalFoldersSynced += items.length;
    },
    onSyncStateChanged: () => {
      checkRemoteSyncStatus({ state, config });
    },
    handleSyncError: (error, itemName, checkpoint) => {
      errorHandler.handleSyncError({
        error,
        syncItemType: 'folders',
        itemName,
        itemCheckpoint: checkpoint,
      });
    },
  });
}
