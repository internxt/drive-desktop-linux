import { ipcMain } from 'electron';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import eventBus from '../event-bus';
import { setInitialSyncState } from './InitialSyncReady';
import { remoteSyncController, resyncRemoteSync, startRemoteSync } from './service';

ipcMain.handle('START_REMOTE_SYNC', async () => {
  await startRemoteSync();
  eventBus.emit('REMOTE_CHANGES_SYNCHED');
});

ipcMain.handle('get-remote-sync-status', () => remoteSyncController.getSyncStatus());

eventBus.on('RECEIVED_REMOTE_CHANGES', async () => {
  // Wait before checking for updates, could be possible
  // that we received the notification, but if we check
  // for new data we don't receive it
  await resyncRemoteSync();
});

eventBus.on('APP_DATA_SOURCE_INITIALIZED', async () => {
  await startRemoteSync().catch((error) => {
    logger.error({
      tag: 'SYNC-ENGINE',
      msg: 'Error starting remote sync controller',
      error,
    });
  });
});

eventBus.on('USER_LOGGED_OUT', () => {
  setInitialSyncState('NOT_READY');
  remoteSyncController.resetRemoteSync();
});
