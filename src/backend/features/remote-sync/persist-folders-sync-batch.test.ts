import { partialSpyOn, call } from 'tests/vitest/utils.helper';

import * as createOrUpdateFolderModule from '../../../infra/sqlite/services/folder/create-or-update-folder-by-batch';
import { persistFoldersSyncBatch } from './persist-folders-sync-batch';
import type { FolderSyncMappingDto } from './types';

describe('persist-folders-sync-batch', () => {
  const createOrUpdateMock = partialSpyOn(createOrUpdateFolderModule, 'createOrUpdateFolderByBatch');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should map items and call createOrUpdateFolderByBatch', async () => {
    // Given
    createOrUpdateMock.mockResolvedValue({ data: [] });
    const items: FolderSyncMappingDto[] = [
      {
        uuid: 'f1',
        type: 'folder',
        bucket: 'b1',
        createdAt: '',
        updatedAt: '',
        plainName: 'Folder 1',
        status: 'EXISTS',
        removed: false,
        deleted: false,
        parentUuid: '',
        userId: 1,
      },
    ];

    // When
    const result = await persistFoldersSyncBatch({ items });

    // Then
    expect(result).toStrictEqual({ data: undefined });
    call(createOrUpdateMock).toMatchObject({
      folders: [
        expect.objectContaining({
          uuid: 'f1',
          plainName: 'Folder 1',
          status: 'EXISTS',
        }),
      ],
    });
  });

  it('should return error when batch persistence fails', async () => {
    // Given
    const error = new Error('Database write error');
    createOrUpdateMock.mockResolvedValue({ error });
    const items: FolderSyncMappingDto[] = [];

    // When
    const result = await persistFoldersSyncBatch({ items });

    // Then
    expect(result).toStrictEqual({ error });
  });
});
