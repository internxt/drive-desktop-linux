import { ipcMain } from 'electron';
import { BackupInfo } from '../../../../backups/BackupInfo';
import { broadcastToWindows } from '../../../windows';
import { StopReason } from '../BackupsStopController/BackupsStopController';
import { BackupsIPCMain } from '../BackupsIpc';
import { IndividualBackupProgress } from '../types/IndividualBackupProgress';
import { BackupsProgress } from '../types/BackupsProgress';
import _ from 'lodash';
import Logger from 'electron-log';

const TWO_SECONDS = 2_000;

export class BackupsProcessTracker {
  private processed = 0;
  private total = 0;
  private lastBackupExistReason: StopReason | undefined = undefined;
  private current: IndividualBackupProgress = {
    total: 0,
    processed: 0,
  };

  constructor(private readonly notify: (progress: BackupsProgress) => void) {}

  progress(): BackupsProgress {
    return {
      currentFolder: this.currentIndex(),
      totalFolders: this.totalBackups(),
      partial: this.current,
    };
  }

  track(backups: Array<BackupInfo>): void {
    this.total = backups.length;
  }

  currentTotal(total: number) {
    this.current.total = total;
  }

  currentProcessed(processed: number) {
    this.current.processed = processed;

    _.debounce(() => this.notify(this.progress()), TWO_SECONDS);
  }

  backing(_: BackupInfo) {
    this.processed++;

    this.current = {
      total: 0,
      processed: 0,
    };

    this.notify(this.progress());
  }

  currentIndex(): number {
    return this.processed;
  }

  totalBackups(): number {
    return this.total;
  }

  backupFinishedWith(finishReason: StopReason) {
    this.lastBackupExistReason = finishReason;
  }

  get lastExitReason() {
    return this.lastBackupExistReason;
  }

  reset() {
    this.processed = 0;
    this.total = 0;

    this.lastBackupExistReason = undefined;

    this.current = {
      total: 0,
      processed: 0,
    };
  }
}

export function initiateBackupsProcessTracker(): BackupsProcessTracker {
  const notifyUI = (progress: BackupsProgress) => {
    Logger.debug('Progress', progress);
    broadcastToWindows('backup-progress', progress);
  };

  const tracker = new BackupsProcessTracker(notifyUI);

  ipcMain.handle('get-last-backup-exit-reason', () => {
    return tracker.lastExitReason;
  });

  BackupsIPCMain.on('backups.total-items-calculated', (_, total: number) => {
    tracker.currentProcessed(total);
  });
  BackupsIPCMain.on('backups.progress-update', (_, processed: number) => {
    tracker.currentProcessed(processed);
  });

  return tracker;
}
