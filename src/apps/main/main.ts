import 'reflect-metadata';
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Only effective during development
// the variables are injectedif (process.env.NODE_ENV === 'production') {

// via webpack in prod
import 'dotenv/config';
// ***** APP BOOTSTRAPPING ****************************************************** //
import { PATHS } from '../../core/electron/paths';
import { setupElectronLog } from '@internxt/drive-desktop-core/build/backend';

setupElectronLog({
  logsPath: PATHS.LOGS,
});

import './virtual-root-folder/handlers';
import '../../core/auto-launch/handlers';
import './auth/handlers';
import './windows/settings';
import './windows/process-issues';
import './issues/virtual-drive';
import './device/handlers';
import './../../backend/features/usage/handlers/handlers';
import './realtime';
import './tray/tray';
import './tray/handlers';
import './fordwardToWindows';
import './analytics/handlers';
import './platform/handlers';
import './config/handlers';
import './app-info/handlers';
import './remote-sync/handlers';
import './../../backend/features/cleaner/ipc/handlers';
import './virtual-drive';

import { app, ipcMain } from 'electron';
import eventBus from './event-bus';
import { AppDataSource } from './database/data-source';
import { getIsLoggedIn } from './auth/handlers';
import { getOrCreateWidged, getWidget, setBoundsOfWidgetByPath } from './windows/widget';
import { createAuthWindow, getAuthWindow } from './windows/auth';
import configStore from './config';
import { getTray, setTrayStatus } from './tray/tray';
import { broadcastToWindows } from './windows';
import { openOnboardingWindow } from './windows/onboarding';
import { setupThemeListener, getTheme } from '../../core/theme';
// import { installNautilusExtension } from './nautilus-extension/install';
// import { uninstallNautilusExtension } from './nautilus-extension/uninstall';
import dns from 'node:dns';
import { registerAvailableUserProductsHandlers } from '../../backend/features/payments/ipc/register-available-user-products-handlers';
import { getAntivirusManager } from './antivirus/antivirusManager';
import { registerAuthIPCHandlers } from '../../infra/ipc/auth-ipc-handlers';
import { registerQuitHandler } from '../../core/quit/quit.handler';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { trySetupAntivirusIpcAndInitialize } from './background-processes/antivirus/try-setup-antivirus-ipc-and-initialize';
import { getUserAvailableProductsAndStore } from '../../backend/features/payments/services/get-user-available-products-and-store';
import { handleDeeplink } from './auth/deeplink/handle-deeplink';
import { setupAppImageDeeplink } from './auth/deeplink/setup-appimage-deeplink';
import { version, release } from 'node:os';
import { INTERNXT_VERSION } from '../../core/utils/utils';
import { registerBackupHandlers } from '../../backend/features/backup/register-backup-handlers';
import { startBackupsIfAvailable } from '../../backend/features/backup/start-backups-if-available';
import { checkForUpdates } from './auto-update/check-for-updates';

const gotTheLock = app.requestSingleInstanceLock();
app.setAsDefaultProtocolClient('internxt');

if (!gotTheLock) {
  app.quit();
}

registerAuthIPCHandlers();
registerQuitHandler();

logger.debug({
  msg: 'Starting app',
  version: INTERNXT_VERSION,
  isPackaged: app.isPackaged,
  osVersion: version(),
  osRelease: release(),
});

let pendingUpdateInfo: { version: string } | null = null;

ipcMain.handle('get-update-status', () => pendingUpdateInfo);

if (process.env.NODE_ENV === 'production') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development') {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require('electron-debug')({ showDevTools: false });
}

app
  .whenReady()
  .then(async () => {
    /**
     * v.2.5.1
     * Esteban Galvis Triana
     * .AppImage users may experience login issues because the deeplink protocol
     * is not registered automatically, unlike with .deb packages.
     * This function manually registers the protocol handler for .AppImage installations.
     */
    await setupAppImageDeeplink();
    /**
     * TODO: Nautilus extension disabled temporarily
     * v.2.5.4
     * Esteban Galvis Triana
     * The Nautilus extension will be temporarily disabled
     * while the exact behavior of the context menu options is being determined.
     */
    // await installNautilusExtension();
    setupThemeListener();

    eventBus.emit('APP_IS_READY');
    const isLoggedIn = getIsLoggedIn();

    if (!isLoggedIn) {
      await createAuthWindow();
      setTrayStatus('IDLE');
    }

    await checkForUpdates({
      currentVersion: INTERNXT_VERSION,
      onUpdateAvailable: (updateInfo) => {
        pendingUpdateInfo = updateInfo;
        broadcastToWindows('update-available', updateInfo);
      },
    });
    registerAvailableUserProductsHandlers();
  })
  .catch((exc) => logger.error({ msg: 'Error starting app', exc }));

app.on('second-instance', async (_, argv) => {
  logger.debug({ tag: 'AUTH', msg: 'Deeplink received on second instance, processing...' });
  const deeplinkArg = argv.find((arg) => arg.startsWith('internxt://'));
  if (!deeplinkArg) return;

  try {
    await handleDeeplink({ url: deeplinkArg });
  } catch (error) {
    logger.error({ tag: 'AUTH', msg: 'Error handling deeplink', error });
  }
});

eventBus.on('WIDGET_IS_READY', () => {
  registerBackupHandlers();
  startBackupsIfAvailable();
});

eventBus.on('USER_LOGGED_IN', async () => {
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
    reportError(error as Error);
  }
});

eventBus.on('USER_LOGGED_OUT', async () => {
  setTrayStatus('IDLE');
  const widget = getWidget();

  if (widget) {
    widget?.hide();

    void getAntivirusManager().shutdown();
  }

  await createAuthWindow();

  if (widget) {
    widget.destroy();
  }
  if (AppDataSource.isInitialized) {
    await AppDataSource.destroy();
  }

  // await uninstallNautilusExtension();
});

process.on('uncaughtException', (error) => {
  /**
   * v.2.5.1
   * Esteban Galvis Triana
   * EPIPE errors close stdout, so they must be handled specially to avoid infinite logging loops.
   */
  if ('code' in error && error.code === 'EPIPE') return;

  if (error.name === 'AbortError') {
    logger.debug({ msg: 'Fetch request was aborted' });
  } else {
    try {
      logger.error({ msg: 'Uncaught exception in main process: ', error });
    } catch {
      return;
    }
  }
});

ipcMain.handle('check-internet-connection', async () => {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      resolve(!err);
    });

    setTimeout(() => resolve(false), 3000);
  });
});
