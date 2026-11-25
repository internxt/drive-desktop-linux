import { app, ipcMain } from 'electron';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { stopVirtualDriveOnce } from '../../backend/features/virtual-drive/services/drive-folder/virtual-drive.service';
import { stopMailBridge } from '../../backend/features/mail-bridge';
import { stopAntivirus } from '../../backend/features/antivirus/stop-antivirus';

export function registerQuitHandler() {
  let isQuitting = false;

  const cleanupAndQuit = async () => {
    if (isQuitting) {
      return;
    }

    isQuitting = true;
    logger.debug({ msg: '[APP] quitting, stopping background services...' });
    await Promise.all([stopMailBridge(), stopVirtualDriveOnce(), stopAntivirus()]);
    logger.debug({ msg: '[APP] background services stopped, quitting' });
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
