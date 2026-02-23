import { logger } from '@internxt/drive-desktop-core/build/backend';
import { backupErrorsTracker, status, backupManager } from '.';
import { registerBackupConfigurationIpcHandlers } from './ipc/register-backup-configuration-ipc-handlers';
import { registerBackupFatalErrorsIpcHandler } from './ipc/register-backup-fatal-errors-ipc-handler';
import { registerBackupProcessStatusIpcHandler } from './ipc/register-backup-process-status-ipc-handler';
import { registerEventBusBackupHandlers } from './ipc/register-event-bus-backup-handlers';
import { registerBackupLifecycleIpcHandlers } from './ipc/register-backup-lifecycle-ipc-handlers';

export function registerBackupHandlers() {
  logger.debug({ tag: 'BACKUPS', msg: 'Registering backup IPC and event bus handlers' });
  registerBackupFatalErrorsIpcHandler(backupErrorsTracker);
  registerBackupProcessStatusIpcHandler(status);
  registerBackupConfigurationIpcHandlers(backupManager);
  registerBackupLifecycleIpcHandlers();
  registerEventBusBackupHandlers();
}
