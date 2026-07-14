import { logger } from '@internxt/drive-desktop-core/build/backend';
import { TokenScheduler } from '../token-scheduler/TokenScheduler';
import { resetTrayStatus } from '../tray/tray-setup';
import { getWidget } from '../windows/widget';
import { createAuthWindow } from '../windows/auth';
import { stopVirtualDriveOnce } from '../../../backend/features/virtual-drive/services/drive-folder/virtual-drive.service';
import { resetAppDataSourceOnLogout } from '../database/data-source';
import { uninstallNautilusExtension } from '../../../backend/features/nautilus-extension/uninstall';
import { setInitialSyncState } from '../remote-sync/InitialSyncReady';
import { remoteSyncManager, cancelPendingRemoteSync } from '../remote-sync/service';
import { AntivirusScanService } from '../antivirus/AntivirusScanService';
import { getAntivirusManager } from '../antivirus/antivirusManager';
import { cleanupAntivirusIpc } from '../background-processes/antivirus/try-setup-antivirus-ipc-and-initialize';
import { DependencyInjectionUserProvider } from '../../shared/dependency-injection/DependencyInjectionUserProvider';

type CleanupStepProps = {
  step: string;
  task: () => Promise<void> | void;
};

let closeUserSessionResourcesInFlight: Promise<void> | undefined;

async function runCleanupStep({ step, task }: CleanupStepProps) {
  try {
    await task();
  } catch (error) {
    logger.error({
      tag: 'AUTH',
      msg: '[LOGOUT] Failed to run cleanup step',
      step,
      error,
    });
  }
}

async function executeCloseUserSessionResources() {
  logger.debug({ tag: 'AUTH', msg: '[LOGOUT] Closing user session resources' });
  const widget = getWidget();

  await runCleanupStep({
    step: 'hide-widget-and-tray',
    task: () => {
      resetTrayStatus('IDLE');

      if (widget && !widget.isDestroyed()) {
        widget.hide();
      }
    },
  });

  await runCleanupStep({
    step: 'clear-dependency-injection-user',
    task: () => {
      DependencyInjectionUserProvider.clearUser();
    },
  });

  await runCleanupStep({
    step: 'cancel-token-refresh-jobs',
    task: () => {
      TokenScheduler.cancelAllJobs();
    },
  });

  await runCleanupStep({
    step: 'stop-remote-sync',
    task: () => {
      cancelPendingRemoteSync();
      setInitialSyncState('NOT_READY');
      remoteSyncManager.resetRemoteSync();
    },
  });

  await runCleanupStep({
    step: 'stop-antivirus',
    task: async () => {
      cleanupAntivirusIpc();
      await AntivirusScanService.cancelScan();
      await getAntivirusManager().shutdown();
    },
  });

  await runCleanupStep({
    step: 'stop-virtual-drive',
    task: async () => {
      await stopVirtualDriveOnce();
    },
  });

  await runCleanupStep({
    step: 'reset-data-source',
    task: async () => {
      await resetAppDataSourceOnLogout();
    },
  });

  await runCleanupStep({
    step: 'open-auth-window',
    task: async () => {
      await createAuthWindow();
    },
  });

  if (widget && !widget.isDestroyed()) {
    widget.destroy();
  }

  await runCleanupStep({
    step: 'uninstall-nautilus-extension',
    task: async () => {
      await uninstallNautilusExtension();
    },
  });

  logger.debug({ tag: 'AUTH', msg: '[LOGOUT] User session resources closed' });
}

export async function closeUserSessionResources() {
  if (closeUserSessionResourcesInFlight) {
    await closeUserSessionResourcesInFlight;
    return;
  }

  closeUserSessionResourcesInFlight = executeCloseUserSessionResources();

  try {
    await closeUserSessionResourcesInFlight;
  } finally {
    closeUserSessionResourcesInFlight = undefined;
  }
}
