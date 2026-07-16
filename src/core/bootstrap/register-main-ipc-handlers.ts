import dns from 'node:dns';
import { ipcMain } from 'electron';
import { detectAvailableFileManager } from '../../backend/features/file-manager-extension/detect-available';
import { getPendingUpdateInfo } from './bootstrap-runtime-state';

export function registerMainIpcHandlers() {
  ipcMain.handle('get-update-status', () => getPendingUpdateInfo());
  ipcMain.handle('get-file-manager-availability', async () => {
    const fileManager = await detectAvailableFileManager();
    return fileManager !== null;
  });

  ipcMain.handle('check-internet-connection', async () => {
    return new Promise((resolve) => {
      dns.lookup('google.com', (err) => {
        resolve(!err);
      });

      setTimeout(() => resolve(false), 3000);
    });
  });
}
