import { partialSpyOn, call } from 'tests/vitest/utils.helper';

import * as fetchFilesModule from '../../../infra/drive-server/services/files/services/fetch-files';
import { DriveServerError } from '../../../infra/drive-server/drive-server.error';
import { fetchFilesSyncPage } from './fetch-files-sync-page';
import type { FileSyncDto } from './types';

describe('fetch-files-sync-page', () => {
  const fetchFilesSyncMock = partialSpyOn(fetchFilesModule, 'fetchFilesSync');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return files and nextCursor when request succeeds', async () => {
    // Given
    const files = [
      { id: 1, uuid: 'f1', plainName: 'File 1' },
      { id: 2, uuid: 'f2', plainName: 'File 2' },
    ];
    fetchFilesSyncMock.mockResolvedValue({
      data: {
        files: files as unknown as FileSyncDto[],
        nextCursor: 'cursor-token-123',
      },
    });

    // When
    const result = await fetchFilesSyncPage({
      request: { limit: 10, updatedAt: '1970-01-01T00:00:00.000Z', status: 'EXISTS' },
    });

    // Then
    expect(result).toStrictEqual({
      data: {
        items: files,
        nextCursor: 'cursor-token-123',
      },
    });
    call(fetchFilesSyncMock).toMatchObject({
      limit: 10,
      updatedAt: '1970-01-01T00:00:00.000Z',
      status: 'EXISTS',
    });
  });

  it('should propagate error when drive server fails', async () => {
    // Given
    const error = new DriveServerError('NETWORK_ERROR', 500);
    fetchFilesSyncMock.mockResolvedValue({ error });

    // When
    const result = await fetchFilesSyncPage({
      request: { limit: 10, cursor: 'valid-cursor' },
    });

    // Then
    expect(result).toStrictEqual({ error });
  });
});
