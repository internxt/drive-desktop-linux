import { ipcMain } from 'electron';
import { BackupFatalErrors, BackupFatalError } from './BackupFatalErrors';
import { broadcastToWindows } from '../../../windows';

export function listenForBackupsErrors() {
  const backupErrors = new BackupFatalErrors(
    (errors: Array<BackupFatalError>) => {
      broadcastToWindows('backup-fatal-errors-changed', errors);
    }
  );

  ipcMain.handle('get-backup-fatal-errors', () => backupErrors.get());

  ipcMain.on(
    'add-backup-fatal-errors',
    (_, errors: Array<BackupFatalError>) => {
      backupErrors.add(errors);
    }
  );

  return backupErrors;
}
