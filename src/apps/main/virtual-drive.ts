import { ipcMain } from 'electron';
import { getFuseDriveState, startVirtualDrive, stopAndClearFuseApp, updateFuseApp } from '../drive';
import eventBus from './event-bus';

eventBus.on('USER_LOGGED_OUT', stopAndClearFuseApp);
eventBus.on('INITIAL_SYNC_READY', startVirtualDrive);
eventBus.on('REMOTE_CHANGES_SYNCHED', updateFuseApp);

ipcMain.handle('get-virtual-drive-status', () => {
  return getFuseDriveState();
});
