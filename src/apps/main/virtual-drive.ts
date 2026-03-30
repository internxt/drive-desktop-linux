import { ipcMain } from 'electron';
import { getFuseDriveState, startVirtualDrive, updateFuseApp, stopHydrationApi } from '../drive';
import eventBus from './event-bus';

eventBus.on('USER_LOGGED_OUT', stopHydrationApi);
eventBus.on('INITIAL_SYNC_READY', startVirtualDrive);
eventBus.on('REMOTE_CHANGES_SYNCHED', updateFuseApp);

ipcMain.handle('get-virtual-drive-status', () => {
  return getFuseDriveState();
});
