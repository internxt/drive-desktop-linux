import { logger } from '@internxt/drive-desktop-core/build/backend';
import { broadcastToWindows } from '../../../apps/main/windows';
import {
  BackupCompleted,
  ForcedByUser,
} from '../../../apps/main/background-processes/backups/BackupsStopController/BackupsStopController';
// import { BackupsProgress } from '../../../apps/main/background-processes/backups/types/BackupsProgress';
// import { IndividualBackupProgress } from '../../../apps/main/background-processes/backups/types/IndividualBackupProgress';
import { SyncError } from '../../../shared/issues/SyncErrorCause';
export type WorkerExitCause = ForcedByUser | BackupCompleted | SyncError;

export class BackupProgressTracker {
  private totalItems = 0;
  private processedItems = 0;

  // private current: IndividualBackupProgress = {
  //   total: 0,
  //   processed: 0,
  // };

  addToTotal(totalBackups: number): void {
    this.totalItems += totalBackups;
  }

  reset() {
    this.processedItems = 0;
    this.totalItems = 0;
  }

  incrementProcessed(count: number): void {
    this.processedItems += count;
    this.emitProgress();
  }

  getPercentage(): number {
    if (this.totalItems === 0) return 0;
    return Math.min(100, Math.round((this.processedItems / this.totalItems) * 100));
  }

  private emitProgress(): void {
    const percentage = this.getPercentage();
    logger.debug({ tag: 'BACKUPS', msg: 'Progress update', percentage });
    broadcastToWindows('backup-progress', percentage);
  }

  /* Deprecated */
  public getCurrentProcessed(): number {
    return this.current.processed;
  }

  /* Deprecated */
  public updateCurrentProcessed(newProcessedCount: number): void {
    this.current.processed = newProcessedCount;
    this.updateProgress(this.progress());
  }

  /* Deprecated */
  public initializeCurrentBackup(total: number, processed: number): void {
    this.current.total = total;
    this.current.processed = processed;
    this.updateProgress(this.progress());
  }
}
