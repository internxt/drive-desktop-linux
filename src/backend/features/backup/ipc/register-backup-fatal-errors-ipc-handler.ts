import { ipcMain } from 'electron';
import { BackupFatalErrors } from '../BackupFatalErrors';

export function registerBackupFatalErrorsIpcHandler(backupErrors: BackupFatalErrors) {
  ipcMain.handle('get-backup-fatal-errors', () => backupErrors.getAll());
  ipcMain.handle('get-backup-error-by-folder', (_, folderId: number) => backupErrors.get(folderId));
  ipcMain.handle('get-last-backup-had-issues', () => backupErrors.lastBackupHadFatalIssue());
}
