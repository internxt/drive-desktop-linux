import { ipcMain } from 'electron';
import { BackupsProcessTracker } from '../../../../apps/main/background-processes/backups/BackupsProcessTracker/BackupsProcessTracker';

export function registerBackupProcessTrackerIpcHandlers(tracker: BackupsProcessTracker) {
    ipcMain.handle('get-last-backup-exit-reason', () => {
    return tracker.getLastExitReason();
  });
}
