import { logger } from '@internxt/drive-desktop-core/build/backend';
import { BackupInfo } from '../../../../backups/BackupInfo';
import { broadcastToWindows } from '../../../windows';
import { BackupCompleted, ForcedByUser } from '../BackupsStopController/BackupsStopController';
import { BackupsProgress } from '../types/BackupsProgress';
import { IndividualBackupProgress } from '../types/IndividualBackupProgress';
import { ProcessFatalErrorName } from '../BackupFatalErrors/BackupFatalErrors';
export type WorkerExitCause = ForcedByUser | BackupCompleted | ProcessFatalErrorName;

export class BackupsProcessTracker {
  private processed = 0;
  private total = 0;

  private current: IndividualBackupProgress = {
    total: 0,
    processed: 0,
  };

  private lastExistReason: WorkerExitCause | undefined;
  public exitReasons: Map<number, WorkerExitCause> = new Map();

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

    this.updateProgress(this.progress());
  }

  getLastExistReason() {
    return this.lastExistReason;
  }

  backing(_: BackupInfo) {
    this.processed++;

    this.current = {
      total: 0,
      processed: 0,
    };

    this.updateProgress(this.progress());
  }

  currentIndex(): number {
    return this.processed;
  }

  totalBackups(): number {
    return this.total;
  }

  backupFinished(id: number, reason: WorkerExitCause) {
    this.exitReasons.set(id, reason);
    this.lastExistReason = reason;
  }

  getExitReason(id: number): WorkerExitCause | undefined {
    logger.debug({ tag: 'BACKUPS', msg: 'Getting exit reason', exitReasons: Array.from(this.exitReasons.keys()), id });
    return this.exitReasons.get(id);
  }

  reset() {
    this.processed = 0;
    this.total = 0;

    this.current = {
      total: 0,
      processed: 0,
    };
  }

  updateProgress (progress: BackupsProgress){
    logger.debug({ tag: 'BACKUPS', msg: 'Progress update', progress });
    broadcastToWindows('backup-progress', progress);
  };
}

