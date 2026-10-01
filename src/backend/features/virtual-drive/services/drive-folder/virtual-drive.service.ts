import { Container } from 'diod';
import { DriveDependencyContainerFactory } from '../../../../../apps/drive/dependency-injection/DriveDependencyContainerFactory';
import { getRootVirtualDrive } from '../../../../../apps/main/virtual-root-folder/service';
import { startDaemon } from '../daemon.service';
import { startFuseDaemonServer } from '../server.service';
import { DependencyInjectionUserProvider } from '../../../../../apps/shared/dependency-injection/DependencyInjectionUserProvider';
import { clearHydrationState } from '../../../fuse/on-read/download-cache/hydration-state';
import { StorageFilesRepository } from '../../../../../context/storage/StorageFiles/domain/StorageFilesRepository';
import { remountVirtualDrive } from './remount-virtual-drive';
import { stopVirtualDrive } from './stop-virual-drive';
import { startHydrationApi } from '../hydration-api.service';
import { LazyVirtualDriveMetadataSynchronizationService } from '../lazy/LazyVirtualDriveMetadataSynchronizationService';
import { DirectoryStateRepository } from '../lazy/directory-state-sqlite-repository';

let container: Container | undefined;
let stopInFlight: Promise<void> | undefined;
let remountInFlight: Promise<void> | undefined;
let startInFlight: Promise<void> | undefined;
let mountGeneration = 0;

export function getVirtualDriveContainer(): Container | undefined {
  return container;
}

export function resetVirtualDriveServiceState() {
  container = undefined;
  startInFlight = undefined;
  stopInFlight = undefined;
  remountInFlight = undefined;
  mountGeneration = 0;
}

export async function startVirtualDrive() {
  if (stopInFlight) {
    await stopInFlight;
  }

  if (container) {
    return;
  }

  if (startInFlight) {
    return startInFlight;
  }

  const generation = mountGeneration;
  startInFlight = (async () => {
    const localRoot = getRootVirtualDrive();
    const newContainer = await DriveDependencyContainerFactory.build();
    await DirectoryStateRepository.clear();
    await newContainer.get(LazyVirtualDriveMetadataSynchronizationService).seedRootFolders({
      user: DependencyInjectionUserProvider.get(),
    });
    /**
     * Clear stale block-cache state and orphaned hydrated files before mounting.
     * Future virtual-drive reads recreate cache files and hydrate only requested blocks.
     */
    clearHydrationState();
    await newContainer.get(StorageFilesRepository).deleteAll();
    if (generation !== mountGeneration) return;

    await startFuseDaemonServer(newContainer);
    await startHydrationApi({ container: newContainer });
    if (generation !== mountGeneration) return;

    await startDaemon(localRoot);
    if (generation !== mountGeneration) return;

    container = newContainer;
  })();

  try {
    await startInFlight;
  } finally {
    startInFlight = undefined;
  }
}

export async function stopVirtualDriveOnce() {
  if (stopInFlight) {
    return stopInFlight;
  }

  mountGeneration += 1;
  const pendingStart = startInFlight;
  stopInFlight = (async () => {
    try {
      await pendingStart;
    } catch {
      // startVirtualDrive propagates its own failure to its caller.
    }

    const currentContainer = container;
    container = undefined;
    await stopVirtualDrive({ container: currentContainer });
  })();

  try {
    await stopInFlight;
  } finally {
    stopInFlight = undefined;
  }
}

export async function remountVirtualDriveOnRootChange({ oldPath, newPath }: { oldPath: string; newPath: string }) {
  if (remountInFlight) return remountInFlight;

  remountInFlight = remountVirtualDrive({ oldPath, newPath });

  try {
    await remountInFlight;
  } finally {
    remountInFlight = undefined;
  }
}
