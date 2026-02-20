import { app, ipcMain } from 'electron';
import { stopAndClearFuseApp } from '../../apps/drive';
export function registerQuitHandler() {
  ipcMain.on('user-quit', async () => {
    await stopAndClearFuseApp();
    app.quit();
  });
}
