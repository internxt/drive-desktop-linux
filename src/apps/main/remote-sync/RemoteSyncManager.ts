import { logger } from '@internxt/drive-desktop-core/build/backend';
import { SyncConfig, rewind, SIX_HOURS_IN_MILLISECONDS } from './helpers';
import { DatabaseCollectionAdapter } from '../database/adapters/base';
import { DriveFolder } from '../database/entities/DriveFolder';
import { DriveFile } from '../database/entities/DriveFile';
import { Nullable } from '../../shared/types/Nullable';
import { RemoteSyncErrorHandler } from './RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { syncRemoteFiles as syncFiles } from '../../../backend/features/remote-sync/sync-remote-files';
import { syncRemoteFolders as syncFolders } from '../../../backend/features/remote-sync/sync-remote-folders';
import { beginRemoteSync } from '../../../backend/features/remote-sync/store/begin-remote-sync';
import { remoteSyncState } from '../../../backend/features/remote-sync/store/remote-sync-state';
import { setAggregateStatus } from '../../../backend/features/remote-sync/store/set-aggregate-status';
import { setFilesSyncResult } from '../../../backend/features/remote-sync/store/set-files-sync-result';
import { setFoldersSyncResult } from '../../../backend/features/remote-sync/store/set-folders-sync-result';

export class RemoteSyncManager {
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

  /**
   * Triggers a remote sync so we can populate the localDB, this sync
   * is global and starts pulling all the files the user has in remote.
   *
   * Throws an error if there's a sync in progress for this class instance
   */
  async startRemoteSync() {
    if (remoteSyncState.status === 'SYNCING') {
      logger.debug({ tag: 'SYNC-ENGINE', msg: 'Sync already in progress, skipping' });
      return;
    }

    const testPassed = this.smokeTest();

    if (!testPassed) {
      return;
    }

    beginRemoteSync({
      syncFiles: this.config.syncFiles,
      syncFolders: this.config.syncFolders,
    });

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
      setAggregateStatus('SYNC_FAILED');
      logger.error({
        tag: 'SYNC-ENGINE',
        msg: 'Remote sync failed with uncontrolled error: ',
        error,
      });
    } finally {
      logger.debug({
        tag: 'SYNC-ENGINE',
        msg: `Total synced files: ${remoteSyncState.totalFilesSynced}`,
      });
      logger.debug({
        tag: 'SYNC-ENGINE',
        msg: `Total synced folders: ${remoteSyncState.totalFoldersSynced}`,
      });
    }
  }

  /**
   * Run smoke tests before starting the RemoteSyncManager, otherwise fail
   */
  private smokeTest() {
    if (remoteSyncState.status === 'SYNCING') {
      logger.warn({
        tag: 'SYNC-ENGINE',
        msg: 'RemoteSyncManager should not be in SYNCING status to start, not starting again',
      });

      return false;
    }

    return true;
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
      retryDelayMs: this.config.retryDelayMs,
    });

    if (result.error) {
      setFilesSyncResult({ error: true, totalSynced: 0 });
    } else {
      setFilesSyncResult({ error: false, totalSynced: result.data.totalSynced });
    }
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
      retryDelayMs: this.config.retryDelayMs,
    });

    if (result.error) {
      setFoldersSyncResult({ error: true, totalSynced: 0 });
    } else {
      setFoldersSyncResult({ error: false, totalSynced: result.data.totalSynced });
    }
  }
}