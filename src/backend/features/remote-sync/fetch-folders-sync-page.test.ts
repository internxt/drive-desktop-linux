import { partialSpyOn, call } from 'tests/vitest/utils.helper';

import * as fetchFoldersModule from '../../../infra/drive-server/services/folder/services/fetch-folders';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { fetchFoldersSyncPage } from './fetch-folders-sync-page';
import type { FolderSyncDto } from './types';

describe('fetch-folders-sync-page', () => {
  const fetchFoldersSyncMock = partialSpyOn(fetchFoldersModule, 'fetchFoldersSync');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return folders and nextCursor when request succeeds', async () => {
    // Given
    const folders = [
      { id: 1, uuid: 'f1', plainName: 'Folder 1' },
      { id: 2, uuid: 'f2', plainName: 'Folder 2' },
    ];
    fetchFoldersSyncMock.mockResolvedValue({
      data: {
        folders: folders as unknown as FolderSyncDto[],
        nextCursor: 'next-page-token',
      },
    });

    // When
    const result = await fetchFoldersSyncPage({
      request: { limit: 10, updatedAt: '1970-01-01T00:00:00.000Z', status: 'EXISTS' },
    });

    // Then
    expect(result).toStrictEqual({
      data: {
        items: folders,
        nextCursor: 'next-page-token',
      },
    });
    call(fetchFoldersSyncMock).toMatchObject({
      limit: 10,
      updatedAt: '1970-01-01T00:00:00.000Z',
      status: 'EXISTS',
    });
  });

  it('should propagate error when drive server fails', async () => {
    // Given
    const networkError = new DriveServerError('NETWORK_ERROR', 500);
    fetchFoldersSyncMock.mockResolvedValue({ error: networkError });

    // When
    const result = await fetchFoldersSyncPage({
      request: { limit: 10, cursor: 'valid-cursor' },
    });

    // Then
    expect(result).toStrictEqual({ error: networkError });
  });
});
