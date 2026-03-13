import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { loggerMock } from 'tests/vitest/mocks.helper';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
import { fetchFolders } from './fetch-folders';

describe('fetchFolders', () => {
  const driveServerGetMock = partialSpyOn(driveServerClient, 'GET');

  const defaultQuery = {
    limit: 50,
    offset: 0,
    status: 'ALL' as const,
    updatedAt: undefined,
  };

  it('should return folders and hasMore=false when response has fewer items than limit', async () => {
    const foldersData = [
      { id: 1, uuid: 'folder-uuid-1' },
      { id: 2, uuid: 'folder-uuid-2' },
    ];
    driveServerGetMock.mockResolvedValue({ data: foldersData } as object);

    const result = await fetchFolders(defaultQuery);

    expect(result.data?.folders).toEqual(foldersData);
    expect(result.data?.hasMore).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('should return hasMore=true when response length equals limit', async () => {
    const foldersData = Array.from({ length: 50 }, (_, i) => ({ id: i, uuid: `folder-uuid-${i}` }));
    driveServerGetMock.mockResolvedValue({ data: foldersData } as object);

    const result = await fetchFolders(defaultQuery);

    expect(result.data?.hasMore).toBe(true);
  });

  it('should pass updatedAt to the query when provided', async () => {
    driveServerGetMock.mockResolvedValue({ data: [] } as object);

    const query = { ...defaultQuery, updatedAt: '2026-01-01T00:00:00.000Z' };
    await fetchFolders(query);

    expect(driveServerGetMock).toHaveBeenCalledWith('/folders', { query });
  });

  it('should log and return error when the request fails', async () => {
    const error = new DriveServerError('NETWORK_ERROR', 500);
    driveServerGetMock.mockResolvedValue({ data: undefined, error } as object);

    const result = await fetchFolders(defaultQuery);

    expect(result.error).toBe(error);
  });

  it('should return error when response is not an array', async () => {
    driveServerGetMock.mockResolvedValue({ data: { unexpected: 'object' } } as object);

    const result = await fetchFolders(defaultQuery);

    expect(result.error).toBeInstanceOf(DriveServerError);
    expect(result.error?.cause).toBe('UNKNOWN');
    call(loggerMock.error).toMatchObject({
      msg: expect.stringContaining('Expected to receive an array of folders'),
      path: '/folders',
    });
  });
});
