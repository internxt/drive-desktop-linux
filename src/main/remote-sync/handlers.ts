import eventBus from '../event-bus';
import { RemoteSyncManager } from './RemoteSyncManager';
import { DriveFilesCollection } from '../database/collections/DriveFileCollection';
import { DriveFoldersCollection } from '../database/collections/DriveFolderCollection';
import { clearRemoteSyncStore } from './helpers';
import { getNewTokenClient } from '../../shared/HttpClient/main-process-client';
import Logger from 'electron-log';
import { ipcMain } from 'electron';
import { reportError } from '../bug-report/service';

const driveFilesCollection = new DriveFilesCollection();
const driveFoldersCollection = new DriveFoldersCollection();
const remoteSyncManager = new RemoteSyncManager(
  {
    files: driveFilesCollection,
    folders: driveFoldersCollection,
  },
  {
    httpClient: getNewTokenClient(),
    fetchFilesLimitPerRequest: 50,
    fetchFoldersLimitPerRequest: 50,
    syncFiles: true,
    syncFolders: true,
  }
);

ipcMain.handle('GET_UPDATED_REMOTE_ITEMS', async () => {
  try {
    await remoteSyncManager.startRemoteSync();

    if (remoteSyncManager.getSyncStatus() !== 'SYNCED') {
      throw new Error(
        'The RemoteSyncManager is out of sync, you should not retrieve files and folders since they could be not up to date with the remote ones'
      );
    }
    const [allDriveFiles, allDriveFolders] = await Promise.all([
      driveFilesCollection.getAll(),
      driveFoldersCollection.getAll(),
    ]);

    if (!allDriveFiles.success)
      throw new Error('Failed to retrieve all the drive files from local db');

    if (!allDriveFolders.success)
      throw new Error('Failed to retrieve all the drive folders from local db');
    return {
      files: allDriveFiles.result,
      folders: allDriveFolders.result,
    };
  } catch (error) {
    reportError(error as Error, {
      description:
        'Something failed when updating the local db pulling the new changes from remote',
    });
    throw error;
  }
});
eventBus.on('USER_LOGGED_IN', () => {
  Logger.info('Received user logged in event, running RemoteSyncManager');
  remoteSyncManager.onStatusChange((newStatus) => {
    Logger.info(`RemoteSyncManager status: ${newStatus}`);
  });

  remoteSyncManager.startRemoteSync().catch((error) => {
    Logger.error('Error starting remote sync manager', error);
    reportError(error);
  });
});

eventBus.on('USER_LOGGED_OUT', () => {
  clearRemoteSyncStore();
});
