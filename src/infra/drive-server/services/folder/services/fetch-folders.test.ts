import { partialSpyOn } from 'tests/vitest/utils.helper';
import { driveServerClient } from '../../../client/drive-server.client.instance';
import { DriveServerError } from '../../../drive-server.error';
import { fetchFoldersSync } from './fetch-folders';

describe('fetch-folders', () => {
  const driveServerGetMock = partialSpyOn(driveServerClient, 'GET');

  const defaultQuery = {
    limit: 50,
  };

  it('should return folders and nextCursor when response is valid', async () => {
    const foldersData = [
      { id: 1, uuid: 'folder-uuid-1' },
      { id: 2, uuid: 'folder-uuid-2' },
    ];
    driveServerGetMock.mockResolvedValue({ data: { folders: foldersData, nextCursor: null } } as object);

    const result = await fetchFoldersSync(defaultQuery);

    expect(result.data?.folders).toStrictEqual(foldersData);
    expect(result.data?.nextCursor).toBeNull();
    expect(result.error).toBeUndefined();
  });

  it('should forward nextCursor when more pages are available', async () => {
    driveServerGetMock.mockResolvedValue({
      data: { folders: [], nextCursor: 'cursor-token-123' },
    } as object);

    const result = await fetchFoldersSync(defaultQuery);

    expect(result.data?.nextCursor).toBe('cursor-token-123');
  });

  it('should pass status and updatedAt to the query when provided', async () => {
    driveServerGetMock.mockResolvedValue({ data: { folders: [], nextCursor: null } } as object);

    const query = { ...defaultQuery, status: 'EXISTS' as const, updatedAt: '2026-01-01T00:00:00.000Z' };
    await fetchFoldersSync(query);

    expect(driveServerGetMock).toHaveBeenCalledWith('/folders/sync', { query });
  });

  it('should pass cursor to the query when provided', async () => {
    driveServerGetMock.mockResolvedValue({ data: { folders: [], nextCursor: null } } as object);

    const query = { ...defaultQuery, cursor: 'cursor-abc' };
    await fetchFoldersSync(query);

    expect(driveServerGetMock).toHaveBeenCalledWith('/folders/sync', { query });
  });

  it('should return error when the request fails', async () => {
    const error = new DriveServerError('NETWORK_ERROR', 500);
    driveServerGetMock.mockResolvedValue({ data: undefined, error } as object);

    const result = await fetchFoldersSync(defaultQuery);

    expect(result.error).toBe(error);
  });

  it('should return unknown error when data is empty', async () => {
    driveServerGetMock.mockResolvedValue({ data: undefined, error: undefined } as object);

    const result = await fetchFoldersSync(defaultQuery);

    expect(result.error).toBeInstanceOf(DriveServerError);
    expect(result.error?.cause).toBe('UNKNOWN');
  });
});
