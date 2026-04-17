import { logger } from '@internxt/drive-desktop-core/build/backend';
import eventBus from '../event-bus';
import { AppDataSource, resetAppDataSourceOnLogout } from '../database/data-source';
import { getOrCreateWidged, getWidget, setBoundsOfWidgetByPath } from '../windows/widget';
import { createAuthWindow, getAuthWindow } from '../windows/auth';
import configStore from '../config';
import { getTray, setTrayStatus } from '../tray/tray';
import { openOnboardingWindow } from '../windows/onboarding';
import { getTheme } from '../../../core/theme';
import { getAntivirusManager } from '../antivirus/antivirusManager';
import { trySetupAntivirusIpcAndInitialize } from '../background-processes/antivirus/try-setup-antivirus-ipc-and-initialize';
import { getUserAvailableProductsAndStore } from '../../../backend/features/payments/services/get-user-available-products-and-store';
import { registerBackupHandlers } from '../../../backend/features/backup/register-backup-handlers';
import { startBackupsIfAvailable } from '../../../backend/features/backup/start-backups-if-available';

function onWidgetIsReady() {
  registerBackupHandlers();
  startBackupsIfAvailable();
}

async function onUserLoggedIn() {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      eventBus.emit('APP_DATA_SOURCE_INITIALIZED');
    }

    getAuthWindow()?.hide();

    getTheme();

    setTrayStatus('IDLE');
    const widget = await getOrCreateWidged();
    const tray = getTray();
    if (widget && tray) {
      setBoundsOfWidgetByPath(widget, tray);
    }

    setTimeout(() => {
      const authWin = getAuthWindow();
      if (authWin && !authWin.isDestroyed()) {
        authWin.destroy();
      }
    }, 300);

    const lastOnboardingShown = configStore.get('lastOnboardingShown');

    if (!lastOnboardingShown) {
      openOnboardingWindow();
    } else if (widget) {
      widget.show();
    }
    await getUserAvailableProductsAndStore();
    await trySetupAntivirusIpcAndInitialize();
  } catch (error) {
    logger.error({
      msg: 'Error on main process while handling USER_LOGGED_IN event:',
      error,
    });
  }
}

async function onUserLoggedOut() {
  setTrayStatus('IDLE');
  const widget = getWidget();

  if (widget) {
    widget.hide();

    void getAntivirusManager().shutdown();
  }

  await createAuthWindow();

  if (widget) {
    widget.destroy();
  }
  await resetAppDataSourceOnLogout();

  // await uninstallNautilusExtension();
}

export function registerSessionEventHandlers() {
  eventBus.on('WIDGET_IS_READY', onWidgetIsReady);
  eventBus.on('USER_LOGGED_IN', onUserLoggedIn);
  eventBus.on('USER_LOGGED_OUT', onUserLoggedOut);
}
