import { logger } from '@internxt/drive-desktop-core/build/backend';
import { Result } from '../../../context/shared/domain/Result';
import { SyncConfig, RemoteSyncedFile } from '../../../apps/main/remote-sync/helpers';
import { RemoteSyncError, RemoteSyncNetworkError } from '../../../apps/main/remote-sync/errors';
import { RemoteSyncErrorHandler } from '../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { createOrUpdateFileByBatch } from '../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { fetchFilesSync } from '../../../infra/drive-server/services/files/services/fetch-files';

type Props = {
  syncConfig: SyncConfig;
  fileCheckPoint: Date | undefined;
  limit: number;
  errorHandler: RemoteSyncErrorHandler;
};

type PageData = { nextCursor: string | null; count: number };

type QueryProps = { fileCheckPoint: Date | undefined; limit: number; nextCursor: string | null };

export async function syncRemoteFiles({
  syncConfig,
  fileCheckPoint,
  limit,
  errorHandler,
}: Props): Promise<Result<{ totalSynced: number }>> {
  let nextCursor: string | null = null;
  let hasMore = true;
  let retryCount = 0;
  let totalSynced = 0;

  while (hasMore && retryCount < syncConfig.maxRetries) {
    try {
      const query = buildFileSyncQuery({ fileCheckPoint, limit, nextCursor });
      logger.debug({ tag: 'SYNC-ENGINE', msg: 'Fetching files sync page', query });

      const result = await fetchAndPersistPage(query);

      if (result.error) {
        // HTTP 400 means invalid cursor; do not retry
        if (result.error.cause === 'BAD_REQUEST') {
          logger.error({
            tag: 'SYNC-ENGINE',
            msg: 'File sync aborted: invalid cursor (HTTP 400)',
            error: result.error,
          });
          return { error: result.error };
        }
        throw new RemoteSyncNetworkError(result.error.message, undefined, result.error.statusCode);
      }

      totalSynced += result.data.count;
      nextCursor = result.data.nextCursor;
      hasMore = nextCursor !== null;
      retryCount = 0;
    } catch (error) {
      retryCount++;

      if (error instanceof RemoteSyncError) {
        errorHandler.handleSyncError(error, 'files', 'unknown', fileCheckPoint);
      } else {
        logger.error({
          tag: 'SYNC-ENGINE',
          msg: 'Remote files sync failed with uncontrolled error',
          error,
        });
      }

      if (retryCount >= syncConfig.maxRetries) {
        return { error: error instanceof Error ? error : new Error('Unknown sync error') };
      }

      await new Promise((resolve) => setTimeout(resolve, 1000 * retryCount));
    }
  }

  logger.debug({ tag: 'SYNC-ENGINE', msg: 'Remote files sync finished' });
  return { data: { totalSynced } };
}

function patchFile(payload: Record<string, unknown>): RemoteSyncedFile {
  return {
    ...(payload as Omit<RemoteSyncedFile, 'fileId' | 'size' | 'name'>),
    fileId: typeof payload.fileId === 'string' ? payload.fileId : '',
    size: typeof payload.size === 'string' ? Number.parseInt(payload.size) : (payload.size as number),
    name: typeof payload.name === 'string' ? payload.name : undefined,
  };
}

function buildFileSyncQuery({ fileCheckPoint, limit, nextCursor }: QueryProps) {
  const filterParams =
    fileCheckPoint === undefined
      ? { status: 'EXISTS' as const, updatedAt: new Date(0).toISOString() }
      : { updatedAt: fileCheckPoint.toISOString() };

  return {
    limit,
    ...filterParams,
    ...(nextCursor !== null ? { cursor: nextCursor } : {}),
  };
}

async function fetchAndPersistPage(
  query: Parameters<typeof fetchFilesSync>[0],
): Promise<Result<PageData, DriveServerError>> {
  const { data, error } = await fetchFilesSync(query);

  if (error) return { error };

  await createOrUpdateFileByBatch({
    files: data.files.map((f) => patchFile(f as unknown as Record<string, unknown>)),
  });

  return { data: { nextCursor: data.nextCursor, count: data.files.length } };
}
