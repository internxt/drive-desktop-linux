import { BackupConfiguration } from '../../../apps/main/background-processes/backups/BackupConfiguration/BackupConfiguration';
import { BackupFatalErrors } from '../../../apps/main/background-processes/backups/BackupFatalErrors/BackupFatalErrors';
import { BackupScheduler } from '../../../apps/main/background-processes/backups/BackupScheduler/BackupScheduler';
import { BackupsProcessStatus } from '../../../apps/main/background-processes/backups/BackupsProcessStatus/BackupsProcessStatus';
import { BackupsProcessTracker } from '../../../apps/main/background-processes/backups/BackupsProcessTracker/BackupsProcessTracker';
import { BackupsStopController } from '../../../apps/main/background-processes/backups/BackupsStopController/BackupsStopController';
import { launchBackupProcesses } from '../../../apps/main/background-processes/backups/launchBackupProcesses';
export const BACKUP_MANUAL_INTERVAL = -1;
export const backupsConfig = new BackupConfiguration();
export const tracker = new BackupsProcessTracker();
export const backupErrorsTracker = new BackupFatalErrors();
export const status = new BackupsProcessStatus('STANDBY');
export const stopController = new BackupsStopController();
export const scheduler = new BackupScheduler(
  () => backupsConfig.lastBackup,
  () => backupsConfig.backupInterval,
  () => launchBackupProcesses(true, tracker, status, backupErrorsTracker, stopController),
);
