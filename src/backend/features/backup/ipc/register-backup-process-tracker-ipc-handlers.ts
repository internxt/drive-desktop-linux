import { ipcMain } from 'electron';
import { BackupsProcessTracker } from '../backup-process-tracker';
import { isSyncError } from '../../../../shared/issues/SyncErrorCause';

export function registerBackupProcessTrackerIpcHandlers(tracker: BackupsProcessTracker) {
  ipcMain.handle('get-last-backup-exit-reason', () => {
    return tracker.getLastExitReason();
  });
}
