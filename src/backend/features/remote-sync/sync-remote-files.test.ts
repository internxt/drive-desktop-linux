import { partialSpyOn, call, calls } from 'tests/vitest/utils.helper';

vi.mock('@internxt/drive-desktop-core/build/backend');

import * as fetchFilesModule from '../../../infra/drive-server/services/files/services/fetch-files';
import * as createOrUpdateFileModule from '../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import type { RemoteSyncErrorHandler } from '../../../apps/main/remote-sync/RemoteSyncErrorHandler/RemoteSyncErrorHandler';
import { syncRemoteFiles } from './sync-remote-files';

describe('sync-remote-files', () => {
  const fetchFilesSyncMock = partialSpyOn(fetchFilesModule, 'fetchFilesSync');
  const createOrUpdateMock = partialSpyOn(createOrUpdateFileModule, 'createOrUpdateFileByBatch');

  const errorHandler = { handleSyncError: vi.fn() } as unknown as RemoteSyncErrorHandler;

  const defaultProps = {
    syncConfig: { retry: 1, maxRetries: 2 },
    fileCheckPoint: undefined as Date | undefined,
    limit: 10,
    errorHandler,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    createOrUpdateMock.mockResolvedValue({ data: [] });
  });

  it('should send status and updatedAt epoch for initial sync', async () => {
    fetchFilesSyncMock.mockResolvedValue({ data: { files: [], nextCursor: null } });

    await syncRemoteFiles(defaultProps);

    call(fetchFilesSyncMock).toMatchObject({
      limit: 10,
      status: 'EXISTS',
      updatedAt: new Date(0).toISOString(),
    });
  });

  it('should send only updatedAt for delta sync', async () => {
    const checkpoint = new Date('2026-01-01T00:00:00.000Z');
    fetchFilesSyncMock.mockResolvedValue({ data: { files: [], nextCursor: null } });

    await syncRemoteFiles({ ...defaultProps, fileCheckPoint: checkpoint });

    call(fetchFilesSyncMock).toMatchObject({ updatedAt: checkpoint.toISOString() });
    call(fetchFilesSyncMock).not.toHaveProperty('status');
  });

  it('should pass cursor alongside filter params on subsequent pages', async () => {
    fetchFilesSyncMock
      .mockResolvedValueOnce({ data: { files: [], nextCursor: 'cursor-abc' } })
      .mockResolvedValueOnce({ data: { files: [], nextCursor: null } });

    await syncRemoteFiles(defaultProps);

    calls(fetchFilesSyncMock).toMatchObject([
      { limit: 10, status: 'EXISTS', updatedAt: new Date(0).toISOString() },
      { limit: 10, status: 'EXISTS', updatedAt: new Date(0).toISOString(), cursor: 'cursor-abc' },
    ]);
  });

  it('should accumulate totalSynced across pages', async () => {
    fetchFilesSyncMock
      .mockResolvedValueOnce({ data: { files: [{ id: 1 }, { id: 2 }], nextCursor: 'cursor-1' } })
      .mockResolvedValueOnce({ data: { files: [{ id: 3 }], nextCursor: null } });

    const result = await syncRemoteFiles(defaultProps);

    expect(result.data?.totalSynced).toBe(3);
  });

  it('should return error immediately on BAD_REQUEST without retrying', async () => {
    fetchFilesSyncMock.mockResolvedValue({ error: new DriveServerError('BAD_REQUEST', 400) });

    const result = await syncRemoteFiles(defaultProps);

    expect(fetchFilesSyncMock).toBeCalledTimes(1);
    expect(result.error).toBeInstanceOf(Error);
    expect(errorHandler.handleSyncError).not.toHaveBeenCalled();
  });

  it('should retry on network error and return error after max retries', async () => {
    fetchFilesSyncMock.mockResolvedValue({ error: new DriveServerError('NETWORK_ERROR', 500) });

    const result = await syncRemoteFiles(defaultProps);

    expect(fetchFilesSyncMock).toBeCalledTimes(2);
    expect(result.error).toBeInstanceOf(Error);
    expect(errorHandler.handleSyncError).toHaveBeenCalled();
  });

  it('should persist files to the database once per page', async () => {
    const files = [{ id: 1, fileId: 'fid', size: '100', name: 'a.txt' }];
    fetchFilesSyncMock
      .mockResolvedValueOnce({ data: { files, nextCursor: 'cursor-1' } })
      .mockResolvedValueOnce({ data: { files, nextCursor: null } });

    await syncRemoteFiles(defaultProps);

    expect(createOrUpdateMock).toBeCalledTimes(2);
  });
});
