import { SIX_HOURS_IN_MILLISECONDS } from '../helpers';
import { createOrUpdateFileByBatch } from '../../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { fetchRemoteFiles } from '../fetch-remote-files';
import { getLastUpdatedCheckpoint } from '../get-last-updated-checkpoint';
import { syncRemoteItems } from '../sync-remote-items';
import { checkRemoteSyncStatus } from './check-remote-sync-status';
import { SyncRemoteItemsPops } from './types';

export async function syncRemoteFiles({
  state,
  db,
  config,
  errorHandler,
  syncConfig,
  from,
}: SyncRemoteItemsPops) {
  await syncRemoteItems({
    from,
    finishMessage: 'Remote files sync finished',
    syncConfig,
    syncItemType: 'files',
    getCheckpoint: () =>
      getLastUpdatedCheckpoint({
        collection: db.files,
        rewindMilliseconds: SIX_HOURS_IN_MILLISECONDS,
      }),
    fetchRemoteItems: (updatedAtCheckpoint) =>
      fetchRemoteFiles({
        limit: config.fetchFilesLimitPerRequest,
        updatedAtCheckpoint,
      }),
    persistRemoteItems: (items) => createOrUpdateFileByBatch({ files: items }),
    onSyncFailed: () => {
      state.filesSyncStatus = 'SYNC_FAILED';
    },
    onSyncFinished: () => {
      state.filesSyncStatus = 'SYNCED';
    },
    onSyncProgress: (items) => {
      state.totalFilesSynced += items.length;
    },
    onSyncStateChanged: () => {
      checkRemoteSyncStatus({ state, config });
    },
    handleSyncError: (error, itemName, checkpoint) => {
      errorHandler.handleSyncError({
        error,
        syncItemType: 'files',
        itemName,
        itemCheckpoint: checkpoint,
      });
    },
  });
}
