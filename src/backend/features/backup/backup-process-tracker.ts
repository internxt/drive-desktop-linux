import { logger } from '@internxt/drive-desktop-core/build/backend';
import { broadcastToWindows } from '../../../apps/main/windows';
import {
  BackupCompleted,
  ForcedByUser,
} from '../../../apps/main/background-processes/backups/BackupsStopController/BackupsStopController';
import { BackupsProgress } from '../../../apps/main/background-processes/backups/types/BackupsProgress';
import { IndividualBackupProgress } from '../../../apps/main/background-processes/backups/types/IndividualBackupProgress';
import { SyncError } from '../../../shared/issues/SyncErrorCause';
export type WorkerExitCause = ForcedByUser | BackupCompleted | SyncError;

export class BackupsProcessTracker {
  private processed = 0;
  private total = 0;

  private current: IndividualBackupProgress = {
    total: 0,
    processed: 0,
  };

  progress(): BackupsProgress {
    return {
      currentFolder: this.processed,
      totalFolders: this.total,
      partial: this.current,
    };
  }

  track(totalBackups: number): void {
    this.total = totalBackups;
  }

  public getCurrentProcessed(): number {
    return this.current.processed;
  }

  public updateCurrentProcessed(newProcessedCount: number): void {
    this.current.processed = newProcessedCount;
    this.updateProgress(this.progress());
  }

  public initializeCurrentBackup(total: number, processed: number): void {
    this.current.total = total;
    this.current.processed = processed;
    this.updateProgress(this.progress());
  }

  backing() {
    this.processed++;

    this.current = {
      total: 0,
      processed: 0,
    };

    this.updateProgress(this.progress());
  }

  reset() {
    this.processed = 0;
    this.total = 0;

    this.current = {
      total: 0,
      processed: 0,
    };
  }

  updateProgress(progress: BackupsProgress) {
    logger.debug({ tag: 'BACKUPS', msg: 'Progress update', progress });
    /**
     * TODO: Emit a percentage progress so that we move the whole calculation to the backend
     * instead of the useBackupProgress.calculatePercentualProgress() in the renderer.
     */
    broadcastToWindows('backup-progress', progress);
  }
}
