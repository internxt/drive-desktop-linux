import { powerSaveBlocker } from 'electron';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { executeBackupWorker } from '../../../apps/main/background-processes/backups/BackukpWorker/executeBackupWorker';
import { BackupFatalErrors } from '../../../apps/main/background-processes/backups/BackupFatalErrors/BackupFatalErrors';
import { BackupsProcessTracker } from '../../../apps/main/background-processes/backups/BackupsProcessTracker/BackupsProcessTracker';
import { BackupsStopController } from '../../../apps/main/background-processes/backups/BackupsStopController/BackupsStopController';

import { isSyncError } from '../../../shared/issues/SyncErrorCause';
import { backupsConfig } from '.';

export async function launchBackupProcesses(
  tracker: BackupsProcessTracker,
  errors: BackupFatalErrors,
  stopController: BackupsStopController,
): Promise<void> {

  const suspensionBlockId = powerSaveBlocker.start('prevent-display-sleep');

  const backups = await backupsConfig.obtainBackupsInfo();
  tracker.track(backups);

  for (const backupInfo of backups) {
    tracker.backing(backupInfo);

    if (stopController.hasStopped()) {
      logger.debug({ tag: 'BACKUPS', msg: 'Stop controller stopped' });
      continue;
    }

    // eslint-disable-next-line no-await-in-loop
    const endReason = await executeBackupWorker(backupInfo, stopController);

    if (isSyncError(endReason)) {
      errors.add({ name: backupInfo.name, error: endReason });
    }

    logger.debug({
      tag: 'BACKUPS',
      msg: 'Backup process ended',
      folderId: backupInfo.folderId,
      endReason,
    });

    tracker.backupFinished(backupInfo.folderId, endReason);
  }
  powerSaveBlocker.stop(suspensionBlockId);
}
