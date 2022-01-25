import 'core-js/stable';
import 'regenerator-runtime/runtime';

import path from 'path';
import { app, BrowserWindow, ipcMain, powerSaveBlocker } from 'electron';
import { autoUpdater } from 'electron-updater';
import Logger from 'electron-log';
import * as uuid from 'uuid';
import * as Auth from './auth/service';
import { AccessResponse } from '../renderer/pages/Login/service';
import { setupRootFolder } from './sync-root-folder/service';
import configStore from './config';
import { SyncArgs, SyncInfoUpdatePayload } from '../workers/sync';
import locksService from './locks-service';
import { SyncFatalErrorName, SyncResult } from '../workers/sync/sync';
import packageJson from '../../package.json';

// ***** APP BOOTSTRAPPING ****************************************************** //

import './sync-root-folder/handlers';
import './auto-launch/handlers';
import './logger';
import './bug-report/handlers';
import './auth/handlers';
import { getSettingsWindow } from './windows/settings';
import { getSyncIssuesWindow } from './windows/sync-issues';
import { getTray, setupTrayIcon } from './tray';
import { createWidget, getWidget } from './windows/widget';

// Only effective during development
// the variables are injected
// via webpack in prod
require('dotenv').config();

Logger.log(`Running ${packageJson.version}`);

function checkForUpdates() {
  autoUpdater.logger = Logger;
  autoUpdater.checkForUpdatesAndNotify();
}

if (process.platform === 'darwin') app.dock.hide();

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

if (process.env.NODE_ENV === 'development') {
  require('electron-debug')({ showDevTools: false });
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

app.on('window-all-closed', () => {
  app.quit();
});

ipcMain.on('user-quit', () => {
  app.quit();
});

app
  .whenReady()
  .then(async () => {
    setupTrayIcon();

    if (process.env.NODE_ENV === 'development') {
      await installExtensions();
    }
    createWidget();
    checkForUpdates();
    if (isLoggedIn) startBackgroundProcesses();
  })
  .catch(Logger.error);

export function onUserUnauthorized() {}

ipcMain.on('user-is-unauthorized', onUserUnauthorized);

// Logged In handling

let isLoggedIn: boolean;

function setIsLoggedIn(value: boolean) {
  isLoggedIn = value;

  getWidget()?.webContents.send('user-logged-in-changed', value);
}

ipcMain.handle('is-user-logged-in', () => isLoggedIn);

setIsLoggedIn(!!Auth.getUser());

// Login handling

ipcMain.on('user-logged-in', (_, data: AccessResponse) => {
  Auth.setCredentials(data.user, data.user.mnemonic, data.token);
  if (!Auth.canHisConfigBeRestored(data.user.uuid)) {
    setupRootFolder();
  }

  setIsLoggedIn(true);

  startBackgroundProcesses();
});

// Logout handling

function closeAuxWindows() {
  getSyncIssuesWindow()?.close();
  getSettingsWindow()?.close();
}

ipcMain.on('user-logged-out', () => {
  cleanBackgroundProcesses();

  closeAuxWindows();

  Auth.logout();

  setIsLoggedIn(false);
});

// Broadcast to renderers

function broadcastToRenderers(eventName: string, data: any) {
  const renderers = [getWidget(), getSyncIssuesWindow(), getSettingsWindow()];

  renderers.forEach((r) => r?.webContents.send(eventName, data));
}

/* BACKGROUND PROCESSES */
function startBackgroundProcesses() {
  // Check if we should launch sync process
  const lastSync = configStore.get('lastSync');

  if (lastSync !== -1) {
    const currentTimestamp = new Date().valueOf();

    const millisecondsToNextSync = lastSync + SYNC_INTERVAL - currentTimestamp;

    if (millisecondsToNextSync <= 0) {
      startSyncProcess();
    } else {
      syncProcessRerun = setTimeout(startSyncProcess, millisecondsToNextSync);
    }
  }
}

function cleanBackgroundProcesses() {
  // stop processes
  ipcMain.emit('stop-sync-process');

  // clear timeouts
  if (syncProcessRerun) clearTimeout(syncProcessRerun);

  clearSyncIssues();
  setTraySyncStatus('STANDBY');
}

/* SYNC */

export type SyncStatus = 'STANDBY' | 'RUNNING';

let syncStatus = 'STANDBY';
let syncProcessRerun: null | ReturnType<typeof setTimeout> = null;
const SYNC_INTERVAL = 10 * 60 * 1000;

ipcMain.on('start-sync-process', startSyncProcess);
ipcMain.handle('get-sync-status', () => syncStatus);

function setTraySyncStatus(newStatus: SyncStatus) {
  const tray = getTray();
  if (newStatus === 'RUNNING') {
    tray?.setState('SYNCING');
  } else if (syncIssues.length !== 0) {
    tray?.setState('ISSUES');
  } else {
    tray?.setState('STANDBY');
  }
}

function changeSyncStatus(newStatus: SyncStatus) {
  syncStatus = newStatus;
  broadcastToRenderers('sync-status-changed', newStatus);
  setTraySyncStatus(newStatus);
}

async function startSyncProcess() {
  if (syncStatus === 'RUNNING') {
    return;
  }

  const suspensionBlockId = powerSaveBlocker.start('prevent-app-suspension');

  changeSyncStatus('RUNNING');

  clearSyncIssues();

  // It's an object to pass it to
  // the individual item processors
  const hasBeenStopped = { value: false };

  ipcMain.once('stop-sync-process', () => {
    hasBeenStopped.value = true;
  });

  const item = {
    folderId: Auth.getUser()?.root_folder_id as number,
    localPath: configStore.get('syncRoot'),
    tmpPath: app.getPath('temp'),
  };
  await processSyncItem(item, hasBeenStopped);

  const currentTimestamp = new Date().valueOf();

  configStore.set('lastSync', currentTimestamp);

  if (syncProcessRerun) {
    clearTimeout(syncProcessRerun);
  }
  if (isLoggedIn)
    syncProcessRerun = setTimeout(startSyncProcess, SYNC_INTERVAL);

  changeSyncStatus('STANDBY');

  ipcMain.removeAllListeners('stop-sync-process');

  powerSaveBlocker.stop(suspensionBlockId);
}

export type SyncStoppedPayload =
  | { reason: 'STOPPED_BY_USER' | 'COULD_NOT_ACQUIRE_LOCK' }
  | {
      reason: 'FATAL_ERROR';
      errorName: SyncFatalErrorName;
    }
  | { reason: 'EXIT'; result: SyncResult };

function processSyncItem(item: SyncArgs, hasBeenStopped: { value: boolean }) {
  return new Promise<void>(async (resolve) => {
    const onExitFuncs: (() => void)[] = [];

    function onExit(payload: SyncStoppedPayload) {
      Logger.log(
        `[onSyncExit] (${payload.reason}) ${
          payload.reason === 'FATAL_ERROR' ? payload.errorName : ''
        } ${payload.reason === 'EXIT' ? payload.result.status : ''}`
      );
      onExitFuncs.forEach((f) => f());
      broadcastToRenderers('sync-stopped', payload);

      resolve();
    }

    function onAcquireLockError(err: any) {
      Logger.log('Could not acquire lock', err);
      onExit({ reason: 'COULD_NOT_ACQUIRE_LOCK' });
    }

    try {
      const lockId = uuid.v4();
      await locksService.acquireLock(item.folderId, lockId);
      onExitFuncs.push(() => locksService.releaseLock(item.folderId, lockId));

      const lockRefreshInterval = setInterval(() => {
        locksService
          .refreshLock(item.folderId, lockId)
          .catch(() => {
            // If we fail to refresh the lock
            // we try to acquire it again
            // before stopping everything
            return locksService.acquireLock(item.folderId, lockId);
          })
          .catch(onAcquireLockError);
      }, 7000);
      onExitFuncs.push(() => clearInterval(lockRefreshInterval));

      // So the interval is cleared before the lock is released
      onExitFuncs.reverse();
    } catch (err) {
      return onAcquireLockError(err);
    }

    if (hasBeenStopped.value) {
      return onExit({ reason: 'STOPPED_BY_USER' });
    }

    ipcMain.handle('get-sync-details', () => item);
    onExitFuncs.push(() => ipcMain.removeHandler('get-sync-details'));

    ipcMain.once('SYNC_FATAL_ERROR', (_, errorName) =>
      onExit({ reason: 'FATAL_ERROR', errorName })
    );
    onExitFuncs.push(() => ipcMain.removeAllListeners('SYNC_FATAL_ERROR'));

    ipcMain.once('SYNC_EXIT', (_, result) =>
      onExit({ reason: 'EXIT', result })
    );
    onExitFuncs.push(() => ipcMain.removeAllListeners('SYNC_EXIT'));

    const worker = spawnSyncWorker();
    onExitFuncs.push(() => worker.destroy());

    if (hasBeenStopped.value) {
      return onExit({ reason: 'STOPPED_BY_USER' });
    }

    const onUserStopped = () => onExit({ reason: 'STOPPED_BY_USER' });
    ipcMain.once('stop-sync-process', onUserStopped);
    onExitFuncs.push(() =>
      ipcMain.removeListener('stop-sync-process', onUserStopped)
    );
  });
}

function spawnSyncWorker() {
  const worker = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    show: false,
  });

  worker
    .loadFile(
      process.env.NODE_ENV === 'development'
        ? '../../release/app/dist/sync/index.html'
        : `${path.join(__dirname, '..', 'sync')}/index.html`
    )
    .catch(Logger.error);

  return worker;
}

ipcMain.on('SYNC_INFO_UPDATE', (_, payload: SyncInfoUpdatePayload) => {
  broadcastToRenderers('sync-info-update', payload);
});

// Sync issues

let syncIssues: SyncInfoUpdatePayload[] = [];

function onSyncIssuesChanged() {
  broadcastToRenderers('sync-issues-changed', syncIssues);
}

function clearSyncIssues() {
  syncIssues = [];
  onSyncIssuesChanged();
}

ipcMain.on('SYNC_INFO_UPDATE', (_, payload: SyncInfoUpdatePayload) => {
  if (
    [
      'PULL_ERROR',
      'RENAME_ERROR',
      'DELETE_ERROR',
      'METADATA_READ_ERROR',
    ].includes(payload.action)
  ) {
    syncIssues.push(payload);
    onSyncIssuesChanged();
  }
});

ipcMain.handle('get-sync-issues', () => syncIssues);

// Handle backups interval

ipcMain.handle('get-backups-interval', () => {
  return configStore.get('backupInterval');
});

ipcMain.handle('set-backups-interval', (_, newValue: number) => {
  return configStore.set('backupInterval', newValue);
});
