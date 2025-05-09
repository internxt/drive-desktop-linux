import 'reflect-metadata';
import 'core-js/stable';
import 'regenerator-runtime/runtime';

// Only effective during development
// the variables are injectedif (process.env.NODE_ENV === 'production') {

// via webpack in prod
import 'dotenv/config';
// ***** APP BOOTSTRAPPING ****************************************************** //
import './virtual-root-folder/handlers';
import './auto-launch/handlers';
import './logger';
import './bug-report/handlers';
import './auth/handlers';
import './windows/settings';
import './windows/process-issues';
import './windows';
import './issues/virtual-drive';
import './device/handlers';
import './usage/handlers';
import './realtime';
import './tray/tray';
import './tray/handlers';
import './fordwardToWindows';
import './analytics/handlers';
import './platform/handlers';
import './thumbnails/handlers';
import './migration/handlers';
import './config/handlers';
import './app-info/handlers';
import './remote-sync/handlers';
import './virtual-drive';
import './payments/handler';

import { app, nativeTheme, ipcMain } from 'electron';
import Logger from 'electron-log';
import { autoUpdater } from 'electron-updater';
import packageJson from '../../../package.json';
import eventBus from './event-bus';
import * as Sentry from '@sentry/electron/main';
import { AppDataSource } from './database/data-source';
import { getIsLoggedIn } from './auth/handlers';
import {
  getOrCreateWidged,
  getWidget,
  setBoundsOfWidgetByPath,
} from './windows/widget';
import { createAuthWindow, getAuthWindow } from './windows/auth';
import configStore from './config';
import { getTray, setTrayStatus } from './tray/tray';
import { openOnboardingWindow } from './windows/onboarding';
import { reportError } from './bug-report/service';
import { setCleanUpFunction } from './quit';
import { stopSyncEngineWatcher } from './background-processes/sync-engine';
import { Theme } from '../shared/types/Theme';
import { installNautilusExtension } from './nautilus-extension/install';
import { uninstallNautilusExtension } from './nautilus-extension/uninstall';
import { setUpBackups } from './background-processes/backups/setUpBackups';
import dns from 'node:dns';
import { setupAntivirusIpc } from './background-processes/antivirus/setupAntivirusIPC';
import { registerAvailableUserProductsHandlers } from './payments/ipc/AvailableUserProductsIPCHandler';
import { getAntivirusManager } from './antivirus/antivirusManager';
import { registerAuthIPCHandlers } from '../../infra/ipc/auth-ipc-handlers';

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
}
registerAuthIPCHandlers();

Logger.log(`Running ${packageJson.version}`);

Logger.log('Initializing Sentry for main process');
if (process.env.SENTRY_DSN) {
  Sentry.init({
    // Enable Sentry only when app is packaged
    enabled: app.isPackaged,
    dsn: process.env.SENTRY_DSN,
    release: packageJson.version,
    debug: !app.isPackaged && process.env.SENTRY_DEBUG === 'true',
    environment: process.env.NODE_ENV,
  });
  Logger.log('Sentry is ready for main process');
} else {
  Logger.error('Sentry DSN not found, cannot initialize Sentry');
}

function checkForUpdates() {
  try {
    autoUpdater.logger = Logger;
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err: unknown) {
    Logger.error(err);
  }
}

if (process.platform === 'darwin') {
  app.dock.hide();
}

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
    await installNautilusExtension();

    eventBus.emit('APP_IS_READY');
    const isLoggedIn = getIsLoggedIn();

    if (!isLoggedIn) {
      await createAuthWindow();
      setTrayStatus('IDLE');
    }

    checkForUpdates();
    registerAvailableUserProductsHandlers();
  })
  .catch(Logger.error);

eventBus.on('WIDGET_IS_READY', () => {
  setUpBackups();

  try {
    Logger.info('[Main] Setting up antivirus IPC handlers');
    setupAntivirusIpc();
    Logger.info('[Main] Antivirus IPC handlers setup complete');

    void getAntivirusManager().initialize();
  } catch (error) {
    Logger.error('[Main] Error setting up antivirus:', error);
  }
});

eventBus.on('USER_LOGGED_IN', async () => {
  try {
    if (!AppDataSource.isInitialized) {
      await AppDataSource.initialize();
      eventBus.emit('APP_DATA_SOURCE_INITIALIZED');
    }

    getAuthWindow()?.hide();

    nativeTheme.themeSource = (configStore.get('preferedTheme') ||
      'system') as Theme;

    setTrayStatus('IDLE');
    const widget = await getOrCreateWidged();
    const tray = getTray();
    if (widget && tray) {
      setBoundsOfWidgetByPath(widget, tray);
    }

    getAuthWindow()?.destroy();

    const lastOnboardingShown = configStore.get('lastOnboardingShown');

    if (!lastOnboardingShown) {
      openOnboardingWindow();
    } else if (widget) {
      widget.show();
    }

    setCleanUpFunction(stopSyncEngineWatcher);

    void getAntivirusManager().initialize();
  } catch (error) {
    Logger.error(error);
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

  await uninstallNautilusExtension();
});

process.on('uncaughtException', (error) => {
  if (error.name === 'AbortError') {
    Logger.log('Fetch request was aborted');
  } else {
    Logger.error('Uncaught exception in main process: ', error);
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
