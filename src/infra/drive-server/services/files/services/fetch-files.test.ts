import { partialSpyOn } from 'tests/vitest/utils.helper';

import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
import { fetchFilesSync } from './fetch-files';

describe('fetch-files', () => {
  const driveServerGetMock = partialSpyOn(driveServerClient, 'GET');

  const defaultQuery = {
    limit: 50,
  };

  it('should return files and nextCursor when response is valid', async () => {
    const filesData = [
      { id: 1, uuid: 'file-uuid-1' },
      { id: 2, uuid: 'file-uuid-2' },
    ];
    driveServerGetMock.mockResolvedValue({ data: { files: filesData, nextCursor: null } } as object);

    const result = await fetchFilesSync(defaultQuery);

    expect(result.data?.files).toStrictEqual(filesData);
    expect(result.data?.nextCursor).toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('should forward nextCursor when more pages are available', async () => {
    driveServerGetMock.mockResolvedValue({
      data: { files: [], nextCursor: 'cursor-token-123' },
    } as object);

    const result = await fetchFilesSync(defaultQuery);

    expect(result.data?.nextCursor).toBe('cursor-token-123');
  });

  it('should pass status and updatedAt to the query when provided', async () => {
    driveServerGetMock.mockResolvedValue({ data: { files: [], nextCursor: null } } as object);

    const query = { ...defaultQuery, status: 'EXISTS' as const, updatedAt: '2026-01-01T00:00:00.000Z' };
    await fetchFilesSync(query);

    expect(driveServerGetMock).toHaveBeenCalledWith('/files/sync', { query });
  });

  it('should pass cursor to the query when provided', async () => {
    driveServerGetMock.mockResolvedValue({ data: { files: [], nextCursor: null } } as object);

    const query = { ...defaultQuery, cursor: 'cursor-abc' };
    await fetchFilesSync(query);

    expect(driveServerGetMock).toHaveBeenCalledWith('/files/sync', { query });
  });

  it('should return error when the request fails', async () => {
    const error = new DriveServerError('NETWORK_ERROR', 500);
    driveServerGetMock.mockResolvedValue({ data: undefined, error } as object);

    const result = await fetchFilesSync(defaultQuery);

    expect(result.error).toBe(error);
  });

  it('should return unknown error when data is empty', async () => {
    driveServerGetMock.mockResolvedValue({ data: undefined, error: undefined } as object);

    const result = await fetchFilesSync(defaultQuery);

    expect(result.error).toBeInstanceOf(DriveServerError);
    expect(result.error?.cause).toBe('UNKNOWN');
  });
});
