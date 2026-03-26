import { app, ipcMain } from 'electron';
import { stopAndClearFuseApp } from '../../apps/drive';

export function registerQuitHandler() {
  let isQuitting = false;

  const cleanupAndQuit = async () => {
    if (isQuitting) {
      return;
    }

    isQuitting = true;
    await stopAndClearFuseApp();
    app.quit();
  };

  ipcMain.on('user-quit', cleanupAndQuit);

  app.on('before-quit', (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    void cleanupAndQuit();
  });
}
