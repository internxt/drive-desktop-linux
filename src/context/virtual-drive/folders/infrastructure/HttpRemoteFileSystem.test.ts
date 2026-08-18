import { partialSpyOn } from '../../../../../tests/vitest/utils.helper';
import * as createFolderModule from '../../../../infra/drive-server/services/folder/services/create-folder';
import * as searchFolderModule from '../../../../infra/drive-server/services/folder/services/search-folder';
import { DriveServerError } from '../../../../infra/drive-server/drive-server.error';
import { FolderId } from '../domain/FolderId';
import { FolderPath } from '../domain/FolderPath';
import { HttpRemoteFileSystem } from './HttpRemoteFileSystem';

describe('HttpRemoteFileSystem', () => {
  const createFolderMock = partialSpyOn(createFolderModule, 'createFolder');
  const searchFolderMock = partialSpyOn(searchFolderModule, 'searchFolder');

  beforeEach(() => {
    createFolderMock.mockReset();
    searchFolderMock.mockReset();
  });

  it('maps NOT_FOUND errors to PARENT_FOLDER_NOT_FOUND for generic retry handling', async () => {
    const sut = new HttpRemoteFileSystem();

    createFolderMock.mockResolvedValue({
      data: undefined,
      error: new DriveServerError('NOT_FOUND', 404, 'Any not found message'),
    });

    const result = await sut.persist('child', 'parent-uuid');

    expect(result.isLeft()).toBe(true);
    expect(result.getLeft()).toMatchObject({
      cause: 'PARENT_FOLDER_NOT_FOUND',
      message: 'Any not found message',
    });
  });

  it('maps BAD_REQUEST errors to BAD_REQUEST', async () => {
    const sut = new HttpRemoteFileSystem();

    createFolderMock.mockResolvedValue({
      data: undefined,
      error: new DriveServerError('BAD_REQUEST', 400, 'Invalid request'),
    });

    const result = await sut.persist('child', 'parent-uuid');

    expect(result.isLeft()).toBe(true);
    expect(result.getLeft().cause).toBe('BAD_REQUEST');
    expect(result.getLeft().message).toBe('');
  });

  it('maps CONFLICT errors to FILE_ALREADY_EXISTS', async () => {
    const sut = new HttpRemoteFileSystem();

    createFolderMock.mockResolvedValue({
      data: undefined,
      error: new DriveServerError('CONFLICT', 409, 'Folder already exists'),
    });

    const result = await sut.persist('child', 'parent-uuid');

    expect(result.isLeft()).toBe(true);
    expect(result.getLeft().cause).toBe('FILE_ALREADY_EXISTS');
    expect(result.getLeft().message).toBe('');
  });

  it('maps TOO_MANY_REQUESTS errors to RATE_LIMITED using retry_after', async () => {
    const sut = new HttpRemoteFileSystem();

    createFolderMock.mockResolvedValue({
      data: undefined,
      error: new DriveServerError('TOO_MANY_REQUESTS', 429, JSON.stringify({ retry_after: 7 })),
    });

    const result = await sut.persist('child', 'parent-uuid');

    expect(result.isLeft()).toBe(true);
    expect(result.getLeft()).toMatchObject({
      cause: 'RATE_LIMITED',
      message: '7000',
    });
  });

  it.each(['NETWORK_ERROR', 'SERVER_ERROR'] as const)('maps %s errors to INTERNAL_SERVER_ERROR', async (cause) => {
    const sut = new HttpRemoteFileSystem();

    createFolderMock.mockResolvedValue({
      data: undefined,
      error: new DriveServerError(cause, 500, 'Remote service failed'),
    });

    const result = await sut.persist('child', 'parent-uuid');

    expect(result.isLeft()).toBe(true);
    expect(result.getLeft().cause).toBe('INTERNAL_SERVER_ERROR');
    expect(result.getLeft().message).toBe('');
  });

  it('maps unknown causes to UNKNOWN', async () => {
    const sut = new HttpRemoteFileSystem();

    createFolderMock.mockResolvedValue({
      data: undefined,
      error: new DriveServerError('UNAUTHORIZED', 401, 'Not allowed'),
    });

    const result = await sut.persist('child', 'parent-uuid');

    expect(result.isLeft()).toBe(true);
    expect(result.getLeft()).toMatchObject({
      cause: 'UNKNOWN',
    });
    expect(result.getLeft().message).toBe('Not allowed');
  });

  it('returns UNKNOWN when neither data nor error is provided', async () => {
    const sut = new HttpRemoteFileSystem();

    createFolderMock.mockResolvedValue({ data: undefined, error: undefined });

    const result = await sut.persist('child', 'parent-uuid');

    expect(result.isLeft()).toBe(true);
    expect(result.getLeft().cause).toBe('UNKNOWN');
    expect(result.getLeft().message).toBe('');
  });

  it('returns a mapped folder dto on success', async () => {
    const sut = new HttpRemoteFileSystem();

    createFolderMock.mockResolvedValue({
      data: {
        id: 12,
        uuid: 'folder-12',
        parentId: 7,
        updatedAt: '2025-01-03T00:00:00.000Z',
        createdAt: '2025-01-02T00:00:00.000Z',
      },
      error: undefined,
    });

    const result = await sut.persist('child', 'parent-uuid');

    expect(result.isRight()).toBe(true);
    expect(result.getRight()).toStrictEqual({
      id: 12,
      uuid: 'folder-12',
      parentId: 7,
      updatedAt: '2025-01-03T00:00:00.000Z',
      createdAt: '2025-01-02T00:00:00.000Z',
    });
  });

  it('returns undefined if a search request fails', async () => {
    const sut = new HttpRemoteFileSystem();

    searchFolderMock.mockResolvedValue({
      data: undefined,
      error: new DriveServerError('SERVER_ERROR', 500, 'Search failed'),
    });

    const result = await sut.searchWith(new FolderId(10), new FolderPath('/root/child'));

    expect(result).toBeUndefined();
  });

  it('returns undefined when the searched folder name is not present', async () => {
    const sut = new HttpRemoteFileSystem();

    searchFolderMock.mockResolvedValue({
      data: [
        {
          id: 1,
          uuid: 'folder-1',
          parentId: 10,
          plainName: 'other-folder',
          updatedAt: '2025-01-01T00:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
          status: 'EXISTS',
        },
      ],
      error: undefined,
    });

    const result = await sut.searchWith(new FolderId(10), new FolderPath('/root/child'));

    expect(result).toBeUndefined();
  });

  it('returns the matching folder from the search result', async () => {
    const sut = new HttpRemoteFileSystem();

    searchFolderMock.mockResolvedValue({
      data: [
        {
          id: 1,
          uuid: '123e4567-e89b-12d3-a456-426614174000',
          parentId: 10,
          plainName: 'child',
          updatedAt: '2025-01-01T00:00:00.000Z',
          createdAt: '2025-01-01T00:00:00.000Z',
          status: 'EXISTS',
        },
      ],
      error: undefined,
    });

    const result = await sut.searchWith(new FolderId(10), new FolderPath('/root/child'));

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      uuid: '123e4567-e89b-12d3-a456-426614174000',
      path: '/root/child',
      name: 'child',
    });
  });

  it('searches across pages until the folder is found', async () => {
    const sut = new HttpRemoteFileSystem();

    const firstPage = Array.from({ length: 50 }, (_, index) => ({
      id: index + 1,
      uuid: `11111111-1111-4111-8111-${String(index + 1).padStart(12, '0')}`,
      parentId: 10,
      plainName: index === 0 ? 'other' : `other-${index}`,
      updatedAt: '2025-01-01T00:00:00.000Z',
      createdAt: '2025-01-01T00:00:00.000Z',
      status: 'EXISTS',
    }));

    searchFolderMock.mockResolvedValueOnce({
      data: firstPage,
      error: undefined,
    });

    searchFolderMock.mockResolvedValueOnce({
      data: [
        {
          id: 51,
          uuid: '22222222-2222-4222-8222-222222222222',
          parentId: 10,
          plainName: 'child',
          updatedAt: '2025-01-02T00:00:00.000Z',
          createdAt: '2025-01-02T00:00:00.000Z',
          status: 'EXISTS',
        },
      ],
      error: undefined,
    });

    const result = await sut.searchWith(new FolderId(10), new FolderPath('/root/child'));

    expect(result).toBeDefined();
    expect(result).toMatchObject({
      uuid: '22222222-2222-4222-8222-222222222222',
      path: '/root/child',
      name: 'child',
    });
    expect(searchFolderMock).toHaveBeenCalledTimes(2);
  });
});
