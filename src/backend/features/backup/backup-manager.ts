import { BackupConfiguration } from '../../../apps/main/background-processes/backups/BackupConfiguration/BackupConfiguration';
import { BackupErrorsTracker } from './backup-errors-tracker';
import { BackupScheduler } from '../../../apps/main/background-processes/backups/BackupScheduler/BackupScheduler';
import { BackupsProcessStatus } from '../../../apps/main/background-processes/backups/BackupsProcessStatus/BackupsProcessStatus';
import { BackupProgressTracker } from './backup-progress-tracker';
import { launchBackupProcesses } from './launch-backup-processes';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { BackupsStatus } from '../../../apps/main/background-processes/backups/BackupsProcessStatus/BackupsStatus';

export class BackupManager {
  private scheduler: BackupScheduler | undefined;
  private abortController = new AbortController();

  constructor(
    private status: BackupsProcessStatus,
    private tracker: BackupProgressTracker,
    private errors: BackupErrorsTracker,
    private config: BackupConfiguration,
  ) {}

  /**
   * v2.7.0 Esteban
   * Created on first use. Building it in the constructor runs while BackupScheduler is still loading,
   * because the file-size retry imports this manager during that load.
   */
  private schedulerForBackups() {
    this.scheduler ??= new BackupScheduler(
      () => this.config.lastBackup,
      () => this.config.backupInterval,
      () => this.startBackup(),
    );

    return this.scheduler;
  }

  public async startBackup(): Promise<void> {
    if (!this.config.enabled) {
      logger.debug({ tag: 'BACKUPS', msg: 'Backups are disabled, not starting' });
      return;
    }

    if (this.isBackupRunning()) {
      logger.debug({ tag: 'BACKUPS', msg: 'Backup already running, skipping' });
      return;
    }

    this.abortController = new AbortController();
    this.errors.clear();
    this.changeBackupStatus('RUNNING');

    try {
      await launchBackupProcesses(this.tracker, this.errors, this.abortController.signal);
    } finally {
      this.changeBackupStatus('STANDBY');
      this.tracker.reset();
    }
  }

  public stopBackup(): void {
    if (!this.isBackupRunning()) {
      logger.debug({ tag: 'BACKUPS', msg: 'No backup running to stop' });
      return;
    }

    this.abortController.abort();
  }

  public startScheduler(): Promise<void> {
    return this.schedulerForBackups().start();
  }

  public stopScheduler(): void {
    this.scheduler?.stop();
  }

  public rescheduleBackups(): void {
    this.schedulerForBackups().reschedule();
  }

  public stopAndClearBackups() {
    this.scheduler?.stop();
    this.errors.clear();
    this.tracker.reset();
    this.abortController = new AbortController();
    this.changeBackupStatus('STANDBY');
  }

  public isScheduled(): boolean {
    return this.scheduler?.isScheduled() ?? false;
  }

  public isBackupRunning(): boolean {
    return this.status.isIn('RUNNING');
  }

  public changeBackupStatus(status: BackupsStatus): void {
    this.status.set(status);
  }
}
