import { Container } from 'diod';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { DriveDependencyContainerFactory } from '../../../../apps/drive/dependency-injection/DriveDependencyContainerFactory';
import { getRootVirtualDrive } from '../../../../apps/main/virtual-root-folder/service';
import { startDaemon, stopDaemon } from './daemon.service';
import { startFuseDaemonServer, stopFuseDaemonServer } from './server.service';
import { updateVirtualDriveContainer } from './update-virtual-drive-container.service';
import { DependencyInjectionUserProvider } from '../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';

let container: Container | undefined;

export function getVirtualDriveContainer(): Container | undefined {
  return container;
}

export async function startVirtualDrive() {
  const localRoot = getRootVirtualDrive();
  container = await DriveDependencyContainerFactory.build();
  await updateVirtualDriveContainer({ container, user: DependencyInjectionUserProvider.get() });
  await startFuseDaemonServer(container);
  await startDaemon(localRoot);
}

export async function stopVirtualDrive() {
  logger.debug({ msg: '[VIRTUAL DRIVE] stopping daemon...' });
  await stopDaemon();
  logger.debug({ msg: '[VIRTUAL DRIVE] stopping server...' });
  await stopFuseDaemonServer();
  logger.debug({ msg: '[VIRTUAL DRIVE] stopped' });
}
