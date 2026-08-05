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
import { DependencyInjectionUserProvider } from '../../shared/dependency-injection/DependencyInjectionUserProvider';
import { tryCatch } from '../../../shared/try-catch';

let closeUserSessionResourcesInFlight: Promise<void> | undefined;

async function executeCloseUserSessionResources() {
  logger.debug({ tag: 'AUTH', msg: '[LOGOUT] Closing user session resources' });
  const widget = getWidget();

  await tryCatch(
    () => {
      resetTrayStatus('IDLE');

      if (widget && !widget.isDestroyed()) {
        widget.hide();
      }
    },
    (error) =>
      logger.error({ tag: 'AUTH', msg: '[LOGOUT] Failed to run cleanup step', step: 'hide-widget-and-tray', error }),
  );

  await Promise.all([
    tryCatch(DependencyInjectionUserProvider.clearUser, (error) =>
      logger.error({
        tag: 'AUTH',
        msg: '[LOGOUT] Failed to run cleanup step',
        step: 'clear-dependency-injection-user',
        error,
      }),
    ),
    tryCatch(TokenScheduler.cancelAllJobs, (error) =>
      logger.error({
        tag: 'AUTH',
        msg: '[LOGOUT] Failed to run cleanup step',
        step: 'cancel-token-refresh-jobs',
        error,
      }),
    ),
    tryCatch(
      async () => {
        await AntivirusScanService.cancelScan();
        await getAntivirusManager().shutdown();
      },
      (error) =>
        logger.error({ tag: 'AUTH', msg: '[LOGOUT] Failed to run cleanup step', step: 'stop-antivirus', error }),
    ),
    tryCatch(
      () => {
        cancelPendingRemoteSync();
        setInitialSyncState('NOT_READY');
        remoteSyncManager.resetRemoteSync();
      },
      (error) =>
        logger.error({ tag: 'AUTH', msg: '[LOGOUT] Failed to run cleanup step', step: 'stop-remote-sync', error }),
    ),
  ]);

  await tryCatch(stopVirtualDriveOnce, (error) =>
    logger.error({ tag: 'AUTH', msg: '[LOGOUT] Failed to run cleanup step', step: 'stop-virtual-drive', error }),
  );

  await tryCatch(resetAppDataSourceOnLogout, (error) =>
    logger.error({ tag: 'AUTH', msg: '[LOGOUT] Failed to run cleanup step', step: 'reset-data-source', error }),
  );

  await tryCatch(createAuthWindow, (error) =>
    logger.error({ tag: 'AUTH', msg: '[LOGOUT] Failed to run cleanup step', step: 'open-auth-window', error }),
  );

  await Promise.all([
    tryCatch(
      () => {
        if (widget && !widget.isDestroyed()) {
          widget.destroy();
        }
      },
      (error) =>
        logger.error({ tag: 'AUTH', msg: '[LOGOUT] Failed to run cleanup step', step: 'destroy-widget', error }),
    ),
    tryCatch(uninstallNautilusExtension, (error) =>
      logger.error({
        tag: 'AUTH',
        msg: '[LOGOUT] Failed to run cleanup step',
        step: 'uninstall-nautilus-extension',
        error,
      }),
    ),
  ]);

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
