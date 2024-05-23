import eventBus from '../../../event-bus';
import { BackupFatalErrors } from '../BackupFatalErrors/BackupFatalErrors';
import { BackupsStopController } from '../BackupsStopController/BackupsStopController';
import { launchBackupProcesses } from '../launchBackupProcesses';
import { BackupsProcessStatus } from '../BackupsProcessStatus/BackupsProcessStatus';
import { BackupScheduler } from './BackupScheduler';
import backupConfiguration from '../BackupConfiguration/BackupConfiguration';
import { BackupsProcessTracker } from '../BackupsProcessTracker/BackupsProcessTracker';

let scheduler: BackupScheduler | undefined = undefined;

export function initiateScheduler(
  tracker: BackupsProcessTracker,
  status: BackupsProcessStatus,
  errors: BackupFatalErrors,
  stopController: BackupsStopController
) {
  scheduler = new BackupScheduler(
    () => backupConfiguration.lastBackup,
    () => backupConfiguration.backupInterval,
    () => launchBackupProcesses(true, tracker, status, errors, stopController)
  );

  return scheduler;
}
