import { ipcMain } from 'electron';
import { BackupInfo } from '../../../../backups/BackupInfo';
import { broadcastToWindows } from '../../../windows';
import { StopReason } from '../BackupsStopController/BackupsStopController';

export class BackupsProcessTracker {
  private processed = 0;
  private total = 0;
  private lastBackupExistReason: StopReason | undefined = undefined;

  track(backups: Array<BackupInfo>): void {
    this.total = backups.length;
  }

  backing(_: BackupInfo) {
    this.processed++;
    broadcastToWindows('backup-progress', {
      currentFolder: this.currentIndex(),
      totalFolders: this.totalBackups(),
    });
  }

  currentIndex(): number {
    return this.processed;
  }

  totalBackups(): number {
    return this.total;
  }

  backupFinishedWith(finishReason: StopReason) {
    this.lastBackupExistReason = finishReason;
    this.reset();
  }

  get lastExitReason() {
    return this.lastBackupExistReason;
  }

  reset() {
    this.processed = 0;
    this.total = 0;
    this.lastBackupExistReason = undefined;
  }
}

export function initiateBackupsProcessTracker(): BackupsProcessTracker {
  const tracker = new BackupsProcessTracker();

  ipcMain.on('BACKUP_PROGRESS', (_, { completedItems, totalItems }) => {
    broadcastToWindows('backup-progress', {
      currentFolder: tracker.currentIndex(),
      totalFoldersToBackup: tracker.totalBackups(),
      completedItems,
      totalItems,
    });
  });

  ipcMain.handle('get-last-backup-exit-reason', () => {
    return tracker.lastExitReason;
  });

  return tracker;
}
