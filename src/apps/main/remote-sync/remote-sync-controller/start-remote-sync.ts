import { logger } from '@internxt/drive-desktop-core/build/backend';
import { changeStatus } from './change-status';
import { syncRemoteFiles } from './sync-remote-files';
import { syncRemoteFolders } from './sync-remote-folders';
import { CreateRemoteSyncControllerPops, RemoteSyncControllerState } from './types';

type StartRemoteSyncPops = CreateRemoteSyncControllerPops & {
  state: RemoteSyncControllerState;
};

export async function startRemoteSync({ state, db, config, errorHandler }: StartRemoteSyncPops) {
  if (state.status === 'SYNCING') {
    logger.warn({
      tag: 'SYNC-ENGINE',
      msg: 'Remote sync controller should not be in SYNCING status to start, not starting again',
    });

    return;
  }

  state.totalFilesSynced = 0;
  state.totalFoldersSynced = 0;
  state.filesSyncStatus = 'IDLE';
  state.foldersSyncStatus = 'IDLE';

  await db.files.connect();
  await db.folders.connect();

  logger.debug({ tag: 'SYNC-ENGINE', msg: 'Starting' });
  changeStatus({ state, newStatus: 'SYNCING' });

  try {
    await Promise.all([
      config.syncFiles
        ? syncRemoteFiles({
            state,
            db,
            config,
            errorHandler,
            syncConfig: {
              retry: 1,
              maxRetries: 3,
            },
          })
        : Promise.resolve(),
      config.syncFolders
        ? syncRemoteFolders({
            state,
            db,
            config,
            errorHandler,
            syncConfig: {
              retry: 1,
              maxRetries: 3,
            },
          })
        : Promise.resolve(),
    ]);
  } catch (error) {
    changeStatus({ state, newStatus: 'SYNC_FAILED' });
    logger.error({
      tag: 'SYNC-ENGINE',
      msg: 'Remote sync failed with uncontrolled error: ',
      error,
    });
  } finally {
    logger.debug({
      tag: 'SYNC-ENGINE',
      msg: `Total synced files: ${state.totalFilesSynced}`,
    });
    logger.debug({
      tag: 'SYNC-ENGINE',
      msg: `Total synced folders: ${state.totalFoldersSynced}`,
    });
  }
}
