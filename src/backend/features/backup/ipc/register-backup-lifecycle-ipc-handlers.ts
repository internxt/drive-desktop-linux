import { logger } from '@internxt/drive-desktop-core/build/backend';
import { ipcMain } from 'electron';
import { backupManager } from '..';
import { userHasBackupsEnabled } from '../utils/user-has-backups-enabled';

export function registerBackupLifecycleIpcHandlers() {
  ipcMain.on('start-backups-process', async () => {
    if (userHasBackupsEnabled()) {
      logger.debug({ tag: 'BACKUPS', msg: 'Backups started manually' });
      backupManager.startBackup();
    }
  });
  ipcMain.on('stop-backups-process', () => {
    logger.debug({ tag: 'BACKUPS', msg: 'Stopping backups' });
    backupManager.stopBackup();
  });
}
