import { partialSpyOn, call } from 'tests/vitest/utils.helper';

import * as createOrUpdateFolderModule from '../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { persistFoldersSyncBatch } from './persist-folders-sync-batch';
import type { FolderSyncDto } from './types';

describe('persist-folders-sync-batch', () => {
  const createOrUpdateMock = partialSpyOn(createOrUpdateFolderModule, 'createOrUpdateFolderByBatch');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should patch items and call createOrUpdateFolderByBatch', async () => {
    // Given
    createOrUpdateMock.mockResolvedValue({ data: [] });
    const items = [
      {
        id: 1,
        uuid: 'f1',
        name: 'Folder 1',
        type: 'folder',
        bucket: 'b1',
        createdAt: '',
        updatedAt: '',
        plainName: 'Folder 1',
        size: 0,
        creationTime: '',
        modificationTime: '',
        status: 'EXISTS' as const,
        removed: false,
        deleted: false,
        parentId: 0,
        parentUuid: '',
        parent: {},
        userId: 1,
        encryptVersion: '',
      },
    ];

    // When
    const result = await persistFoldersSyncBatch({ items });

    // Then
    expect(result).toStrictEqual({ data: undefined });
    call(createOrUpdateMock).toMatchObject({
      folders: [
        expect.objectContaining({
          id: 1,
          uuid: 'f1',
          name: 'Folder 1',
          status: 'EXISTS',
        }),
      ],
    });
  });

  it('should return error when batch persistence fails', async () => {
    // Given
    const error = new Error('Database write error');
    createOrUpdateMock.mockResolvedValue({ error });
    const items: FolderSyncDto[] = [];

    // When
    const result = await persistFoldersSyncBatch({ items });

    // Then
    expect(result).toStrictEqual({ error });
  });
});
