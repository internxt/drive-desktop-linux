import { debounce } from 'lodash';
import eventBus from '../event-bus';
import { DriveFilesCollection } from '../database/collections/DriveFileCollection';
import { DriveFoldersCollection } from '../database/collections/DriveFolderCollection';
import { createRemoteSyncController } from './remote-sync-controller';
import { broadcastToWindows } from '../windows';
import { isInitialSyncReady, setInitialSyncState } from './InitialSyncReady';
import { createRemoteSyncErrorHandler } from './create-remote-sync-error-handler';
import { registerRemoteSyncService } from '../../../context/shared/application/sync/remote-sync-service';
import { toRemoteSyncFileDto } from './to-remote-sync-file-dto';
import { toRemoteSyncFolderDto } from './to-remote-sync-folder-dto';

const SYNC_DEBOUNCE_DELAY = 3_000;

const driveFilesCollection = new DriveFilesCollection();
const driveFoldersCollection = new DriveFoldersCollection();
const errorHandler = createRemoteSyncErrorHandler();
const remoteSyncControllerPops = {
  db: {
    files: driveFilesCollection,
    folders: driveFoldersCollection,
  },
  config: {
    fetchFilesLimitPerRequest: 1000,
    fetchFoldersLimitPerRequest: 1000,
    syncFiles: true,
    syncFolders: true,
  },
  errorHandler,
};

export const remoteSyncController = createRemoteSyncController();

remoteSyncController.onStatusChange(async (newStatus) => {
  if (!isInitialSyncReady() && newStatus === 'SYNCED') {
    setInitialSyncState('READY');
    eventBus.emit('INITIAL_SYNC_READY');
  }
  broadcastToWindows('remote-sync-status-change', newStatus);
});

export async function getUpdatedRemoteItems() {
  const [allDriveFiles, allDriveFolders] = await Promise.all([
    driveFilesCollection.getAll(),
    driveFoldersCollection.getAll(),
  ]);

  if (!allDriveFiles.success) throw new Error('Failed to retrieve all the drive files from local db');

  if (!allDriveFolders.success) throw new Error('Failed to retrieve all the drive folders from local db');

  return {
    files: allDriveFiles.result.map(toRemoteSyncFileDto),
    folders: allDriveFolders.result.map(toRemoteSyncFolderDto),
  };
}

export async function startRemoteSync(): Promise<void> {
  await remoteSyncController.startRemoteSync(remoteSyncControllerPops);
}

const debouncedSynchronization = debounce(async () => {
  await startRemoteSync();
  eventBus.emit('REMOTE_CHANGES_SYNCHED');
}, SYNC_DEBOUNCE_DELAY);

export async function resyncRemoteSync() {
  await debouncedSynchronization();
}

registerRemoteSyncService({
  getUpdatedRemoteItems,
  startRemoteSync,
  resyncRemoteSync,
});

export async function getExistingFiles() {
  const allExisting = await driveFilesCollection.getAllWhere({
    status: 'EXISTS',
  });

  return allExisting.result;
}
