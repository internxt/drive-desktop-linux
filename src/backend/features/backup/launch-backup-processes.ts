import { powerSaveBlocker } from 'electron';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { BackupErrorsTracker } from './backup-errors-tracker';
import { BackupProgressTracker } from './backup-progress-tracker';
import { isSyncError } from '../../../shared/issues/SyncErrorCause';
import { backupsConfig } from '.';
import { BackupService } from '../../../apps/backups/BackupService';
import { BackupsDependencyContainerFactory } from '../../../apps/backups/dependency-injection/BackupsDependencyContainerFactory';
import { DriveDesktopError } from '../../../context/shared/domain/errors/DriveDesktopError';
import { precalculateBackupItemCount } from './precalculate-backup-item-count';

export async function launchBackupProcesses(
  tracker: BackupProgressTracker,
  errors: BackupErrorsTracker,
  signal: AbortSignal,
) {
  const suspensionBlockId = powerSaveBlocker.start('prevent-display-sleep');

  try {
    const backups = await backupsConfig.obtainBackupsInfo();
    const container = await BackupsDependencyContainerFactory.build();
    const backupService = container.get(BackupService);

    logger.debug({
      tag: 'BACKUPS',
      msg: 'Starting backup item count precalculation',
      count: backups.length,
    });

    const itemCounts = new Map<string, number>();

    for (const backup of backups) {
      if (signal.aborted) {
        logger.debug({ tag: 'BACKUPS', msg: 'Precalculation aborted' });
        break;
      }

      const count = await precalculateBackupItemCount(backup, container);
      itemCounts.set(backup.folderUuid, count);
    }

    const backupIds = backups.map((b) => b.folderUuid);
    tracker.initializeWeights(backupIds, itemCounts);

    logger.debug({
      tag: 'BACKUPS',
      msg: 'Starting backup execution with weighted progress',
    });

    for (const backupInfo of backups) {
      logger.debug({
        tag: 'BACKUPS',
        msg: 'Backup info obtained',
        pathname: backupInfo.pathname,
      });

      if (signal.aborted) {
        logger.debug({ tag: 'BACKUPS', msg: 'Backup execution aborted' });
        break;
      }

      tracker.setCurrentBackupId(backupInfo.folderUuid);

      const result = await backupService.runWithRetry(backupInfo, signal, tracker);

      tracker.markBackupAsCompleted(backupInfo.folderUuid);

      if (result.isLeft()) {
        const error = result.getLeft();
        logger.debug({
          tag: 'BACKUPS',
          msg: 'Backup failed',
          pathname: backupInfo.pathname,
          error: error.cause,
        });

        if (error instanceof DriveDesktopError && 'cause' in error && error.cause && isSyncError(error.cause)) {
          errors.add(backupInfo.folderId, {
            name: backupInfo.name,
            error: error.cause,
          });
        }
      }

      logger.debug({
        tag: 'BACKUPS',
        msg: 'Backup execution completed',
        pathname: backupInfo.pathname,
      });
    }
  } finally {
    powerSaveBlocker.stop(suspensionBlockId);
  }
}
