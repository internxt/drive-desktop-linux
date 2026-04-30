import { logger } from '@internxt/drive-desktop-core/build/backend';
import { broadcastToWindows } from '../../../apps/main/windows';
import {
  BackupProgressState,
  createInitialState,
  initializeBackupProgressWeights,
  setCurrentBackupId as setCurrentBackupIdFn,
  markBackupAsCompleted as markBackupAsCompletedFn,
  incrementProcessed as incrementProcessedFn,
  getPercentage as getPercentageFn,
  resetState,
} from './initializeBackupProgressWeights';

export class BackupProgressTracker {
  private state: BackupProgressState;

  constructor() {
    this.state = createInitialState();
  }

  initializeBackupProgressWeights(backupIds: string[], fileCounts: ReadonlyMap<string, number>): void {
    this.state = initializeBackupProgressWeights(this.state, backupIds, fileCounts);
    logger.debug({
      tag: 'BACKUPS',
      msg: 'Backup progress weights initialized',
      weights: Object.fromEntries(this.state.backupWeights),
    });
  }

  setCurrentBackupId(backupId: string): void {
    this.state = setCurrentBackupIdFn(this.state, backupId);
  }

  markBackupAsCompleted(backupId: string): void {
    this.state = markBackupAsCompletedFn(this.state, backupId);
  }

  incrementProcessed(count: number = 1): void {
    this.state = incrementProcessedFn(this.state, count);
    this.emitProgress();
  }

  getPercentage(): number {
    return getPercentageFn(this.state);
  }

  reset(): void {
    this.state = resetState();
  }

  private emitProgress(): void {
    const percentage = this.getPercentage();
    logger.debug({ tag: 'BACKUPS', msg: 'Progress update', percentage });
    broadcastToWindows('backup-progress', percentage);
  }
}
