import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { DriveDependencyContainerFactory } from '../../../../apps/drive/dependency-injection/DriveDependencyContainerFactory';
import { getRootVirtualDrive } from '../../../../apps/main/virtual-root-folder/service';
import { startDaemon, stopDaemon } from './daemon.service';
import { startFuseDaemonServer, stopFuseDaemonServer } from './server.service';
import { updateVirtualDriveContainer } from './update-virtual-drive-container.service';
import { DependencyInjectionUserProvider } from '../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { StorageClearer } from '../../../../context/storage/StorageFiles/application/delete/StorageClearer';
import { abortAllHydrations, clearHydrationState } from '../../fuse/on-read/download-cache/hydration-state';

let container: Container | undefined;

export function getVirtualDriveContainer(): Container | undefined {
  return container;
}

export async function startVirtualDrive() {
  const localRoot = getRootVirtualDrive();
  container = await DriveDependencyContainerFactory.build();
  await updateVirtualDriveContainer({ container, user: DependencyInjectionUserProvider.get() });
  /**
   * Clear stale block-cache state and orphaned hydrated files before mounting.
   * Future virtual-drive reads recreate cache files and hydrate only requested blocks.
   */
  clearHydrationState();
  await container.get(StorageClearer).run();
  await startFuseDaemonServer(container);
  await startDaemon(localRoot);
}

export async function stopVirtualDrive() {
  logger.debug({ msg: '[VIRTUAL DRIVE] stopping daemon...' });
  abortAllHydrations();
  await stopDaemon();
  logger.debug({ msg: '[VIRTUAL DRIVE] clearing storage cache...' });
  clearHydrationState();
  if (container) {
    await container.get(StorageClearer).run();
  }
  logger.debug({ msg: '[VIRTUAL DRIVE] stopping server...' });
  await stopFuseDaemonServer();
  logger.debug({ msg: '[VIRTUAL DRIVE] stopped' });
}
