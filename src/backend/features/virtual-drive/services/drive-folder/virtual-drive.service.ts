import { Container } from 'diod';
import { DriveDependencyContainerFactory } from '../../../../../apps/drive/dependency-injection/DriveDependencyContainerFactory';
import { getRootVirtualDrive } from '../../../../../apps/main/virtual-root-folder/service';
import { startDaemon } from '../daemon.service';
import { startFuseDaemonServer } from '../server.service';
import { clearHydrationState } from '../../../fuse/on-read/download-cache/hydration-state';
import { StorageFilesRepository } from '../../../../../context/storage/StorageFiles/domain/StorageFilesRepository';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { remountVirtualDrive } from './remount-virtual-drive';
import { stopVirtualDrive } from './stop-virual-drive';
import { startHydrationApi } from '../hydration-api.service';
import { DirectoryStateRepository } from '../lazy/directory-state-sqlite-repository';
import { seedVirtualDriveRootFolders } from './seed-virtual-drive-root-folders';
import { getUserOrThrow } from '../../../../../backend/features/auth/get-user-or-throw';

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

async function mountVirtualDrive(startGeneration: number) {
  const localRoot = getRootVirtualDrive();
  const newContainer = await DriveDependencyContainerFactory.build();
  await DirectoryStateRepository.clear();
  await seedVirtualDriveRootFolders({
    folderRepository: newContainer.get(FolderRepository),
    user: getUserOrThrow(),
  });
  /**
   * Clear stale block-cache state and orphaned hydrated files before mounting.
   * Future virtual-drive reads recreate cache files and hydrate only requested blocks.
   */
  clearHydrationState();
  await newContainer.get(StorageFilesRepository).deleteAll();
  if (startGeneration !== mountGeneration) return;

  await startFuseDaemonServer(newContainer);
  await startHydrationApi({ container: newContainer });
  if (startGeneration !== mountGeneration) return;

  await startDaemon(localRoot);
  if (startGeneration !== mountGeneration) return;

  container = newContainer;
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

  const startGeneration = mountGeneration;
  startInFlight = mountVirtualDrive(startGeneration);

  try {
    await startInFlight;
  } finally {
    startInFlight = undefined;
  }
}

async function unmountVirtualDrive(pendingStart: Promise<void> | undefined) {
  try {
    await pendingStart;
  } catch {
    // startVirtualDrive propagates its own failure to its caller.
  }

  const currentContainer = container;
  container = undefined;
  await stopVirtualDrive({ container: currentContainer });
}

export async function stopVirtualDriveOnce() {
  if (stopInFlight) {
    return stopInFlight;
  }

  mountGeneration += 1;
  stopInFlight = unmountVirtualDrive(startInFlight);

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
