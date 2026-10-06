import { partialSpyOn, call } from 'tests/vitest/utils.helper';

import * as createOrUpdateFileModule from '../../../infra/sqlite/services/file/create-or-update-file-by-batch';
import { persistFilesSyncBatch } from './persist-files-sync-batch';
import type { FileSyncDto } from './types';

describe('persist-files-sync-batch', () => {
  const createOrUpdateMock = partialSpyOn(createOrUpdateFileModule, 'createOrUpdateFileByBatch');

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should patch items and call createOrUpdateFileByBatch', async () => {
    // Given
    createOrUpdateMock.mockResolvedValue({ data: [] });
    const items = [
      {
        id: 1,
        uuid: 'file-1',
        name: 'File 1',
        type: 'pdf',
        size: '1024',
        bucket: 'bucket-1',
        fileId: 'fid-1',
        folderId: 10,
        folderUuid: 'folder-1',
        encryptVersion: '',
        userId: 1,
        creationTime: '',
        modificationTime: '',
        createdAt: '',
        updatedAt: '',
        plainName: 'File 1',
        status: 'EXISTS' as const,
      },
    ];

    // When
    const result = await persistFilesSyncBatch({ items });

    // Then
    expect(result).toStrictEqual({ data: undefined });
    call(createOrUpdateMock).toMatchObject({
      files: [
        expect.objectContaining({
          id: 1,
          uuid: 'file-1',
          size: 1024,
          fileId: 'fid-1',
        }),
      ],
    });
  });

  it('should return error when batch persistence fails', async () => {
    // Given
    const error = new Error('Database write failure');
    createOrUpdateMock.mockResolvedValue({ error });
    const items: FileSyncDto[] = [];

    // When
    const result = await persistFilesSyncBatch({ items });

    // Then
    expect(result).toStrictEqual({ error });
  });
});
