import { ipcMain } from 'electron';
import { BackupFatalErrors } from '../../../../apps/main/background-processes/backups/BackupFatalErrors/BackupFatalErrors';

export function resgisterBackupFatalErrorsIpcHandler (backupErrors: BackupFatalErrors) {
  ipcMain.handle('get-backup-fatal-errors', () => backupErrors.get());
}
