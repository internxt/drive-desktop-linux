import Logger from 'electron-log';

import { app, ipcMain } from 'electron';
import eventBus from '../main/event-bus';
import { FuseApp } from './FuseApp';
import path from 'path';
import { FuseDependencyContainerFactory } from './dependency-injection/FuseDependencyContainerFactory';
import { getRootVirtualDrive } from '../main/virtual-root-folder/service';
import { HydrationApi } from '../hydration-api/HydrationApi';

let fuseApp: FuseApp;

async function startFuseApp() {
  const root = getRootVirtualDrive();

  Logger.debug('ROOT FOLDER: ', root);

  const appData = app.getPath('appData');
  const local = path.join(appData, 'internxt-drive', 'downloaded');

  const hydrationApi = new HydrationApi();

  await hydrationApi.start({ debug: true });

  if (!hydrationApi.c) {
    throw new Error('CANNOT ACCESS CONTAINER');
  }

  const containerFactory = new FuseDependencyContainerFactory();
  const container = await containerFactory.build(hydrationApi.c);

  fuseApp = new FuseApp(container, {
    root,
    local,
  });

  await fuseApp.start();
}

export async function stopSyncEngineWatcher() {
  await fuseApp.stop();
}

async function stopAndClearFuseApp() {
  await fuseApp.clearCache();
  await fuseApp.stop();
}

async function updateFuseApp() {
  await fuseApp.update();
}

eventBus.on('USER_LOGGED_OUT', stopAndClearFuseApp);
eventBus.on('USER_WAS_UNAUTHORIZED', stopAndClearFuseApp);
eventBus.on('INITIAL_SYNC_READY', startFuseApp);
eventBus.on('REMOTE_CHANGES_SYNCHED', updateFuseApp);

ipcMain.handle('get-virtual-drive-status', () => {
  if (!fuseApp) {
    return 'MOUNTED';
  }
  return fuseApp.getStatus();
});

ipcMain.handle('retry-virtual-drive-mount', async () => {
  Logger.info('Going to retry mount the app');
  fuseApp.stop();
  await startFuseApp();
});
