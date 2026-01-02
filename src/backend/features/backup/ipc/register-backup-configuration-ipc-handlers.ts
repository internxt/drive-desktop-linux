import { ipcMain } from 'electron';
import { BACKUP_MANUAL_INTERVAL, backupsConfig } from '..';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { BackupScheduler } from '../../../../apps/main/background-processes/backups/BackupScheduler/BackupScheduler';

export function registerBackupConfigurationIpcHandlers(scheduler: BackupScheduler) {
  ipcMain.handle('get-backups-interval', () => {
    return backupsConfig.backupInterval;
  });

  ipcMain.handle('set-backups-interval', (_, interval: number) => {
    backupsConfig.backupInterval = interval;
    if (interval === BACKUP_MANUAL_INTERVAL) {
      scheduler.stop();
      logger.debug({ tag: 'BACKUPS', msg: 'The backups schedule stopped' });
      return;
    } else {
      scheduler.reschedule();
      logger.debug({ tag: 'BACKUPS', msg: 'The backups has been rescheduled' });
    }
  });

  ipcMain.handle('get-last-backup-timestamp', () => {
    return backupsConfig.lastBackup;
  });

  ipcMain.handle('get-backups-enabled', () => {
    return backupsConfig.enabled;
  });

  ipcMain.handle('toggle-backups-enabled', () => {
    backupsConfig.toggleEnabled();
  });

  ipcMain.handle('user.get-has-discovered-backups', () => {
    return backupsConfig.hasDiscoveredBackups();
  });

  ipcMain.on('user.set-has-discovered-backups', () => {
    return backupsConfig.backupsDiscovered();
  });
}
