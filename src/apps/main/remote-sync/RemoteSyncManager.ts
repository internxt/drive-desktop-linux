import { logger } from '@internxt/drive-desktop-core/build/backend';
import { RemoteSyncStatus, SyncConfig, rewind, SIX_HOURS_IN_MILLISECONDS } from './helpers';
import { DatabaseCollectionAdapter } from '../database/adapters/base';
import { DriveFolder } from '../database/entities/DriveFolder';
import { DriveFile } from '../database/entities/DriveFile';
import { Nullable } from '../../shared/types/Nullable';
import { RemoteSyncErrorHandler } from './RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { syncRemoteFiles as syncFiles } from '../../../backend/features/remote-sync/sync-remote-files';
import { syncRemoteFolders as syncFolders } from '../../../backend/features/remote-sync/sync-remote-folders';

export class RemoteSyncManager {
  private foldersSyncStatus: RemoteSyncStatus = 'IDLE';
  private filesSyncStatus: RemoteSyncStatus = 'IDLE';
  private status: RemoteSyncStatus = 'IDLE';
  private onStatusChangeCallbacks: Array<(newStatus: RemoteSyncStatus) => void> = [];
  private totalFilesSynced = 0;
  private totalFoldersSynced = 0;

  constructor(
    private db: {
      files: DatabaseCollectionAdapter<DriveFile>;
      folders: DatabaseCollectionAdapter<DriveFolder>;
    },
    private config: {
      fetchFilesLimitPerRequest: number;
      fetchFoldersLimitPerRequest: number;
      syncFiles: boolean;
      syncFolders: boolean;
    },
    private errorHandler: RemoteSyncErrorHandler,
  ) {}

  getTotalFilesSynced() {
    return this.totalFilesSynced;
  }

  onStatusChange(callback: (newStatus: RemoteSyncStatus) => void) {
    if (typeof callback !== 'function') return;
    this.onStatusChangeCallbacks.push(callback);
  }

  getSyncStatus(): RemoteSyncStatus {
    return this.status;
  }

  /**
   * Check if the RemoteSyncManager is in SYNCED status
   *
   * @returns True if local database is synced with remote files and folders
   */
  localIsSynced() {
    return this.status === 'SYNCED';
  }

  resetRemoteSync() {
    this.changeStatus('IDLE');
    this.filesSyncStatus = 'IDLE';
    this.foldersSyncStatus = 'IDLE';
    this.totalFilesSynced = 0;
    this.totalFoldersSynced = 0;
  }

  /**
   * Triggers a remote sync so we can populate the localDB, this sync
   * is global and starts pulling all the files the user has in remote.
   *
   * Throws an error if there's a sync in progress for this class instance
   */
  async startRemoteSync() {
    const testPassed = this.smokeTest();

    if (!testPassed) {
      return;
    }
    this.totalFilesSynced = 0;
    this.totalFoldersSynced = 0;
    this.filesSyncStatus = 'IDLE';
    this.foldersSyncStatus = 'IDLE';

    await this.db.files.connect();
    await this.db.folders.connect();

    logger.debug({ tag: 'SYNC-ENGINE', msg: 'Starting' });
    this.changeStatus('SYNCING');
    try {
      await Promise.all([
        this.config.syncFiles
          ? this.syncRemoteFiles({
              retry: 1,
              maxRetries: 3,
            })
          : Promise.resolve(),
        this.config.syncFolders
          ? this.syncRemoteFolders({
              retry: 1,
              maxRetries: 3,
            })
          : Promise.resolve(),
      ]);
    } catch (error) {
      this.changeStatus('SYNC_FAILED');
      logger.error({
        tag: 'SYNC-ENGINE',
        msg: 'Remote sync failed with uncontrolled error: ',
        error,
      });
    } finally {
      logger.debug({
        tag: 'SYNC-ENGINE',
        msg: `Total synced files: ${this.totalFilesSynced}`,
      });
      logger.debug({
        tag: 'SYNC-ENGINE',
        msg: `Total synced folders: ${this.totalFoldersSynced}`,
      });
    }
  }

  /**
   * Run smoke tests before starting the RemoteSyncManager, otherwise fail
   */
  private smokeTest() {
    if (this.status === 'SYNCING') {
      logger.warn({
        tag: 'SYNC-ENGINE',
        msg: 'RemoteSyncManager should not be in SYNCING status to start, not starting again',
      });

      return false;
    }

    return true;
  }

  private changeStatus(newStatus: RemoteSyncStatus) {
    if (newStatus === this.status) return;
    logger.debug({
      tag: 'SYNC-ENGINE',
      msg: `RemoteSyncManager ${this.status} -> ${newStatus}`,
    });
    this.status = newStatus;
    this.onStatusChangeCallbacks.forEach((callback) => {
      if (typeof callback !== 'function') return;
      callback(newStatus);
    });
  }

  private checkRemoteSyncStatus() {
    // We only syncing files
    if (this.config.syncFiles && !this.config.syncFolders && this.filesSyncStatus === 'SYNCED') {
      this.changeStatus('SYNCED');
      return;
    }

    // We only syncing folders
    if (!this.config.syncFiles && this.config.syncFolders && this.foldersSyncStatus === 'SYNCED') {
      this.changeStatus('SYNCED');
      return;
    }
    // Files and folders are synced, RemoteSync is Synced
    if (this.foldersSyncStatus === 'SYNCED' && this.filesSyncStatus === 'SYNCED') {
      this.changeStatus('SYNCED');
      return;
    }

    // Files OR Folders sync failed, RemoteSync Failed
    if (this.foldersSyncStatus === 'SYNC_FAILED' || this.filesSyncStatus === 'SYNC_FAILED') {
      this.changeStatus('SYNC_FAILED');
      return;
    }
  }

  private async getFileCheckpoint(): Promise<Nullable<Date>> {
    const { success, result } = await this.db.files.getLastUpdated();

    if (!success) return undefined;

    if (!result) return undefined;

    const updatedAt = new Date(result.updatedAt);

    return rewind(updatedAt, SIX_HOURS_IN_MILLISECONDS);
  }

  private async syncRemoteFiles(syncConfig: SyncConfig, from?: Date) {
    const fileCheckPoint = from ?? (await this.getFileCheckpoint());
    const result = await syncFiles({
      syncConfig,
      fileCheckPoint,
      limit: this.config.fetchFilesLimitPerRequest,
      errorHandler: this.errorHandler,
    });

    if (result.error) {
      this.filesSyncStatus = 'SYNC_FAILED';
    } else {
      this.totalFilesSynced += result.data.totalSynced;
      this.filesSyncStatus = 'SYNCED';
    }
    this.checkRemoteSyncStatus();
  }

  private async getLastFolderSyncAt(): Promise<Nullable<Date>> {
    const { success, result } = await this.db.folders.getLastUpdated();

    if (!success) return undefined;

    if (!result) return undefined;

    const updatedAt = new Date(result.updatedAt);
    return rewind(updatedAt, SIX_HOURS_IN_MILLISECONDS);
  }

  /**
   * Syncs all the remote folders and saves them into the local db
   * @param syncConfig Config to execute the sync with
   * @returns
   */
  private async syncRemoteFolders(syncConfig: SyncConfig, from?: Date) {
    const folderCheckPoint = from ?? (await this.getLastFolderSyncAt());
    const result = await syncFolders({
      syncConfig,
      folderCheckPoint,
      limit: this.config.fetchFoldersLimitPerRequest,
      errorHandler: this.errorHandler,
    });

    if (result.error) {
      this.foldersSyncStatus = 'SYNC_FAILED';
    } else {
      this.totalFoldersSynced += result.data.totalSynced;
      this.foldersSyncStatus = 'SYNCED';
    }
    this.checkRemoteSyncStatus();
  }
}
