import { getRootVirtualDrive } from '../main/virtual-root-folder/service';
import { broadcastToWindows } from '../main/windows';
import { DependencyInjectionUserProvider } from '../shared/dependency-injection/DependencyInjectionUserProvider';
import { VirtualDrive } from './virtual-drive/VirtualDrive';
import { DriveDependencyContainerFactory } from './dependency-injection/DriveDependencyContainerFactory';
import { FuseApp } from './fuse/FuseApp';
import { HydrationApi } from './hydration-api/HydrationApi';
import { logger } from '@internxt/drive-desktop-core/build/backend';

let fuseApp: FuseApp;
let hydrationApi: HydrationApi;

export async function startVirtualDrive() {
  const localRoot = getRootVirtualDrive();

  const container = await DriveDependencyContainerFactory.build();

  const user = DependencyInjectionUserProvider.get();

  const virtualDrive = new VirtualDrive(container);

  hydrationApi = new HydrationApi(container);

  fuseApp = new FuseApp(virtualDrive, container, localRoot, user.root_folder_id, user.rootFolderId);

  fuseApp.on('mounted', () => broadcastToWindows('virtual-drive-status-change', 'MOUNTED'));

  fuseApp.on('mount-error', () => broadcastToWindows('virtual-drive-status-change', 'ERROR'));

  await hydrationApi.start({ debug: false, timeElapsed: false });
  /**
   * v2.5.4
   * Alexis Mora
   * If a user abruptly quits the app, all the hydrated files will be orphaned.
   * Hence why we clear the cache before starting up the virtual drive.
   * To ensure that every time we get a fresh start.
  */
  fuseApp.clearCache();
  await fuseApp.start();
}

export async function stopAndClearFuseApp() {
  await stopHydrationApi();
  await stopFuseApp();
}

export async function updateFuseApp() {
  await fuseApp.update();
}

export function getFuseDriveState() {
  if (!fuseApp) {
    return 'UNMOUNTED';
  }
  return fuseApp.getStatus();
}

async function stopFuseApp() {
  if (!fuseApp) {
    logger.debug({ msg: 'FuseApp not initialized, skipping stop.' });
    return;
  }

  try {
    await stopHydrationApi();
    logger.debug({ msg: 'Stopping and clearing FuseApp...' });
    await fuseApp.clearCache();
    await fuseApp.stop();
  } catch (error) {
    logger.error({ msg: 'Error stopping and clearing FUSE app:', error });
  }
}

export async function stopHydrationApi() {
  if (!hydrationApi) {
    logger.debug({ msg: 'HydrationApi not initialized, skipping stop.' });
    return;
  }

  try {
    logger.debug({ msg: 'Stopping HydrationApi...' });
    await hydrationApi.stop();
  } catch (error) {
    logger.error({ msg: 'Error stopping HydrationApi:', error });
  }
}
