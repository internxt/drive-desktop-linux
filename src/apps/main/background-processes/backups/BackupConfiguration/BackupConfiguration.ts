import { app, ipcMain } from 'electron';
import configStore from '../../../config';
import { BackupInfo } from '../../../../backups/BackupInfo';
import {
  getOrCreateDevice,
  getBackupsFromDevice,
} from '../../../device/service';

class BackupConfiguration {
  get backupInterval(): number {
    return configStore.get('backupInterval');
  }

  set backupInterval(interval: number) {
    configStore.set('backupInterval', interval);
  }

  get lastBackup(): number {
    return configStore.get('lastBackup');
  }

  backupFinished() {
    configStore.set('lastBackup', Date.now());
  }

  get enabled(): boolean {
    return configStore.get('backupsEnabled');
  }

  set enabled(value: boolean) {
    configStore.set('backupsEnabled', value);
  }

  toggleEnabled() {
    const enabled = !this.enabled;
    this.enabled = enabled;
  }

  async obtainBackupsInfo(): Promise<Array<BackupInfo>> {
    const device = await getOrCreateDevice();

    const enabledBackupEntries = await getBackupsFromDevice();

    const backups: BackupInfo[] = enabledBackupEntries.map((backup) => ({
      pathname: backup.pathname,
      folderId: backup.id,
      tmpPath: app.getPath('temp'),
      backupsBucket: device.bucket,
    }));

    return backups;
  }
}

const config = new BackupConfiguration();

ipcMain.handle('get-backups-interval', () => {
  return config.backupInterval;
});

ipcMain.handle('set-backups-interval', (_, interval: number) => {
  config.backupInterval = interval;
});

ipcMain.handle('get-last-backup-timestamp', () => {
  return config.lastBackup;
});

ipcMain.handle('get-backups-enabled', () => {
  return config.enabled;
});

ipcMain.handle('toggle-backups-enabled', () => {
  config.toggleEnabled();
});

export default config;
