import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { DriveDependencyContainerFactory } from '../../../../apps/drive/dependency-injection/DriveDependencyContainerFactory';
import { getRootVirtualDrive } from '../../../../apps/main/virtual-root-folder/service';
import { startDaemon, stopDaemon } from './daemon.service';
import { startFuseDaemonServer, stopFuseDaemonServer } from './server.service';
import { updateVirtualDriveContainer } from './update-virtual-drive-container.service';
import { DependencyInjectionUserProvider } from '../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { StorageClearer } from '../../../../context/storage/StorageFiles/application/delete/StorageClearer';
import { destroyAllHydrations } from '../../fuse/on-read/hydration-registry';

let container: Container | undefined;

export function getVirtualDriveContainer(): Container | undefined {
  return container;
}

export async function startVirtualDrive() {
  const localRoot = getRootVirtualDrive();
  container = await DriveDependencyContainerFactory.build();
  await updateVirtualDriveContainer({ container, user: DependencyInjectionUserProvider.get() });
  /**
   * v2.5.4
   * Alexis Mora
   * If a user abruptly quits the app, all the hydrated files will be orphaned.
   * Hence why we clear the cache before starting up the virtual drive.
   * To ensure that every time we get a fresh start.
   */
  await container.get(StorageClearer).run();
  await startFuseDaemonServer(container);
  await startDaemon(localRoot);
}

export async function stopVirtualDrive() {
  logger.debug({ msg: '[VIRTUAL DRIVE] stopping daemon...' });
  await stopDaemon();
  logger.debug({ msg: '[VIRTUAL DRIVE] clearing storage cache...' });
  await destroyAllHydrations();
  if (container) {
    await container.get(StorageClearer).run();
  }
  logger.debug({ msg: '[VIRTUAL DRIVE] stopping server...' });
  await stopFuseDaemonServer();
  logger.debug({ msg: '[VIRTUAL DRIVE] stopped' });
}
