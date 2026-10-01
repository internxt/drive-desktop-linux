import { logger } from '@internxt/drive-desktop-core/build/backend';
import { RemoteSyncStatus, RemoteSyncedFolder, SyncConfig, rewind, SIX_HOURS_IN_MILLISECONDS } from './helpers';
import { DatabaseCollectionAdapter } from '../database/adapters/base';
import { DriveFolder } from '../database/entities/DriveFolder';
import { DriveFile } from '../database/entities/DriveFile';
import { Nullable } from '../../shared/types/Nullable';
import { RemoteSyncError, RemoteSyncNetworkError } from './errors';
import { RemoteSyncErrorHandler } from './RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { createOrUpdateFolderByBatch } from '../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { fetchFolders } from '../../../infra/drive-server/services/folder/services/fetch-folders';
import { syncRemoteFiles as syncFiles } from '../../../backend/features/remote-sync/sync-remote-files';
import { DirectoryStateRepository } from '../../../backend/features/virtual-drive/services/lazy/directory-state-sqlite-repository';
import { filterStaleRemoteFolders } from '../../../backend/features/remote-sync/filter-stale-remote-items';

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
      retryDelayMs?: number;
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
    if (this.status === 'SYNCING') {
      logger.debug({ tag: 'SYNC-ENGINE', msg: 'Sync already in progress, skipping' });
      return;
    }

    const testPassed = this.smokeTest();

    if (!testPassed) {
      return;
    }

    this.changeStatus('SYNCING');
    this.totalFilesSynced = 0;
    this.totalFoldersSynced = 0;
    this.filesSyncStatus = 'IDLE';
    this.foldersSyncStatus = 'IDLE';

    logger.debug({ tag: 'SYNC-ENGINE', msg: 'Starting' });
    try {
      await this.db.files.connect();
      await this.db.folders.connect();

      if (this.config.syncFolders) {
        await this.syncRemoteFolders({
          retry: 1,
          maxRetries: 3,
        });
      }
      if (this.config.syncFiles) {
        await this.syncRemoteFiles({
          retry: 1,
          maxRetries: 3,
        });
      }
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
    let folderCheckPoint = from ?? (await this.getLastFolderSyncAt());
    let hasMore = true;
    let retryCount = 0;

    while (hasMore && retryCount < syncConfig.maxRetries) {
      let lastFolderSynced = null;

      try {
        const { hasMore: moreAvailable, result } = await this.fetchFoldersFromRemote(folderCheckPoint);

        const freshDirectoryStates = await DirectoryStateRepository.getFreshDirectoryStates();
        const { foldersToPersist, foldersToInvalidate } = filterStaleRemoteFolders({
          folders: result,
          freshDirectoryStates,
        });

        if (foldersToInvalidate.size > 0) {
          await Promise.all(
            Array.from(foldersToInvalidate).map((folderId) =>
              DirectoryStateRepository.invalidate({ folderId, statusScope: 'EXISTS' }),
            ),
          );
        }

        await createOrUpdateFolderByBatch({ folders: foldersToPersist });
        this.totalFoldersSynced += result.length;
        lastFolderSynced = result.length > 0 ? result[result.length - 1] : null;

        hasMore = moreAvailable;

        if (hasMore && lastFolderSynced) {
          folderCheckPoint = new Date(lastFolderSynced.updatedAt);
        }

        // Reset retry count on successful fetch
        retryCount = 0;
      } catch (error) {
        retryCount++;

        if (error instanceof RemoteSyncError) {
          this.errorHandler.handleSyncError(error, 'folders', lastFolderSynced?.name ?? 'unknown', folderCheckPoint);
        } else {
          logger.error({
            tag: 'SYNC-ENGINE',
            msg: 'Remote folders sync failed with uncontrolled error: ',
            error,
          });
        }

        if (retryCount >= syncConfig.maxRetries) {
          this.foldersSyncStatus = 'SYNC_FAILED';
          this.checkRemoteSyncStatus();
          return;
        }

        // Brief delay before retry to avoid hammering the server
        const retryDelay = (this.config.retryDelayMs ?? (process.env.NODE_ENV === 'test' ? 10 : 1000)) * retryCount;
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    logger.debug({
      tag: 'SYNC-ENGINE',
      msg: 'Remote folders sync finished',
    });
    this.foldersSyncStatus = 'SYNCED';
    this.checkRemoteSyncStatus();
  }

  /**
   * Fetch the folders that were updated after the given date
   *
   * @param updatedAtCheckpoint Retrieve folders that were updated after this date
   */
  private async fetchFoldersFromRemote(updatedAtCheckpoint?: Date): Promise<{
    hasMore: boolean;
    result: RemoteSyncedFolder[];
  }> {
    const isBootstrap = updatedAtCheckpoint === undefined;
    const { data, error } = await fetchFolders({
      limit: this.config.fetchFoldersLimitPerRequest,
      offset: 0,
      status: isBootstrap ? 'EXISTS' : 'ALL',
      updatedAt: updatedAtCheckpoint?.toISOString(),
    });

    if (error) {
      throw new RemoteSyncNetworkError(error.message, undefined, error.statusCode);
    }

    return {
      hasMore: data.hasMore,
      result: data.folders.map(this.patchDriveFolderResponseItem),
    };
  }

  private patchDriveFolderResponseItem = (payload: Record<string, unknown>): RemoteSyncedFolder => {
    const status = this.resolveFolderStatus(payload);

    return {
      ...(payload as Omit<RemoteSyncedFolder, 'status' | 'name'>),
      status,
      name: typeof payload.name === 'string' ? payload.name : undefined,
    };
  };

  private resolveFolderStatus(payload: Record<string, unknown>): RemoteSyncedFolder['status'] {
    if (typeof payload.status === 'string' && payload.status) return payload.status;
    if (payload.removed) return 'REMOVED';
    if (payload.deleted) return 'DELETED';
    return 'EXISTS';
  }
}
