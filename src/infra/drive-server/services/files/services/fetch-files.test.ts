import { call, partialSpyOn } from 'tests/vitest/utils.helper';
import { loggerMock } from 'tests/vitest/mocks.helper';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
import { fetchFiles } from './fetch-files';

describe('fetchFiles', () => {
  const driveServerGetMock = partialSpyOn(driveServerClient, 'GET');

  const defaultQuery = {
    limit: 50,
    offset: 0,
    status: 'ALL' as const,
    updatedAt: undefined,
  };

  it('should return files and hasMore=false when response has fewer items than limit', async () => {
    const filesData = [
      { id: 1, uuid: 'file-uuid-1' },
      { id: 2, uuid: 'file-uuid-2' },
    ];
    driveServerGetMock.mockResolvedValue({ data: filesData } as object);

    const result = await fetchFiles(defaultQuery);

    expect(result.data?.files).toStrictEqual(filesData);
    expect(result.data?.hasMore).toBe(false);
    expect(result.error).toBeUndefined();
  });

  it('should return hasMore=true when response length equals limit', async () => {
    const filesData = Array.from({ length: 50 }, (_, i) => ({ id: i, uuid: `file-uuid-${i}` }));
    driveServerGetMock.mockResolvedValue({ data: filesData } as object);

    const result = await fetchFiles(defaultQuery);

    expect(result.data?.hasMore).toBe(true);
  });

  it('should pass updatedAt to the query when provided', async () => {
    driveServerGetMock.mockResolvedValue({ data: [] } as object);

    const query = { ...defaultQuery, updatedAt: '2026-01-01T00:00:00.000Z' };
    await fetchFiles(query);

    expect(driveServerGetMock).toHaveBeenCalledWith('/files', { query });
  });

  it('should log and return error when the request fails', async () => {
    const error = new DriveServerError('NETWORK_ERROR', 500);
    driveServerGetMock.mockResolvedValue({ data: undefined, error } as object);

    const result = await fetchFiles(defaultQuery);

    expect(result.error).toBe(error);
    call(loggerMock.error).toMatchObject({
      msg: 'Error fetching files from remote',
      path: '/files',
      error,
    });
  });

  it('should return error when response is not an array', async () => {
    driveServerGetMock.mockResolvedValue({ data: { unexpected: 'object' } } as object);

    const result = await fetchFiles(defaultQuery);

    expect(result.error).toBeInstanceOf(DriveServerError);
    expect(result.error?.cause).toBe('UNKNOWN');
    call(loggerMock.error).toMatchObject({
      msg: expect.stringContaining('Expected to receive an array of files'),
      path: '/files',
    });
  });
});
