import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';
import { partialSpyOn } from 'tests/vitest/utils.helper';
import type { RemoteSyncedFile } from '../../../../apps/main/remote-sync/helpers';
import { fileRepository } from '../drive-file';
import { createOrUpdateFileByBatch } from './create-or-update-file-by-batch';

describe('create-or-update-file-by-batch', () => {
  const upsertMock = partialSpyOn(fileRepository, 'upsert');

  beforeEach(() => {
    upsertMock.mockReset();
    upsertMock.mockResolvedValue(undefined as never);
  });

  it('persists copies so the caller keeps its file types', async () => {
    upsertMock.mockImplementation(async (chunk: Array<{ type: string }>) => {
      for (const file of chunk) file.type = 'mp4';
    });
    const files: RemoteSyncedFile[] = [
      {
        uuid: 'file-uuid',
        fileId: 'contents-id',
        type: 'docx',
        size: 5040,
        bucket: 'bucket',
        folderUuid: 'folder-uuid',
        userId: 1,
        modificationTime: '2026-01-01T00:00:00.000Z',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        plainName: 'libre_office_save_test',
        status: DriveItemStatus.EXISTS,
      },
    ];

    const result = await createOrUpdateFileByBatch({ files });

    expect(files[0].type).toBe('docx');
    expect(result.data?.[0].nameWithExtension).toBe('libre_office_save_test.docx');
    expect(upsertMock.mock.calls[0][0][0]).not.toBe(files[0]);
  });
});
