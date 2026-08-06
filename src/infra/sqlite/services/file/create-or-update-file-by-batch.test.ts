import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { RemoteSyncedFile } from '../../../../apps/main/remote-sync/helpers';
import { AppDataSource } from '../../../../apps/main/database/data-source';
import { createOrUpdateFileByBatch } from './create-or-update-file-by-batch';
import { parseData } from './parse-data';
import { SqliteError } from '../common/sqlite-error';

vi.mock('@internxt/drive-desktop-core/build/backend', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('../../../../apps/main/database/data-source', () => ({
  AppDataSource: {
    transaction: vi.fn(),
  },
}));

describe('create-or-update-file-by-batch', () => {
  const transactionMock = vi.mocked(AppDataSource.transaction);
  const loggerErrorMock = vi.mocked(logger.error);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an empty result when the files array is empty', async () => {
    const result = await createOrUpdateFileByBatch({ files: [] });

    expect(result).toStrictEqual({ data: [] });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('should upsert files in batches and parse the result', async () => {
    const files: RemoteSyncedFile[] = Array.from({ length: 600 }, (_, index) => ({
      id: index + 1,
      uuid: `uuid-${index}`,
      fileId: `file-${index}`,
      type: 'file',
      size: 100,
      bucket: index % 2 === 0 ? 'bucket' : 'other-bucket',
      folderId: 1,
      folderUuid: 'folder-uuid',
      userId: 1,
      modificationTime: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      plainName: `file-${index}`,
      name: `file-${index}`,
      status: 'EXISTS',
    }));

    const repository = {
      upsert: vi.fn().mockResolvedValue(undefined),
    };

    const manager = {
      getRepository: vi.fn().mockReturnValue(repository),
    };

    transactionMock.mockImplementation(async (...args: unknown[]) => {
      const runInTransaction = args.find(
        (arg): arg is (manager: unknown) => Promise<unknown> => typeof arg === 'function',
      );

      if (runInTransaction) {
        await runInTransaction(manager);
      }
    });

    const result = await createOrUpdateFileByBatch({ files });

    expect(repository.upsert).toHaveBeenCalledTimes(2);
    expect(repository.upsert).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({
          uuid: 'uuid-0',
          bucket: 'bucket',
        }),
      ]),
      { conflictPaths: ['uuid'] },
    );
    expect(result).toStrictEqual({
      data: files.map((data) => parseData({ data })),
    });
  });

  it('should log and return a sqlite error when the transaction fails', async () => {
    const files: RemoteSyncedFile[] = [
      {
        id: 1,
        uuid: 'uuid-1',
        fileId: 'file-1',
        type: 'file',
        size: 100,
        bucket: 'bucket',
        folderId: 1,
        folderUuid: 'folder-uuid',
        userId: 1,
        modificationTime: '2024-01-01T00:00:00.000Z',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        plainName: 'file-1',
        name: 'file-1',
        status: 'EXISTS',
      },
    ];

    transactionMock.mockRejectedValue(new Error('boom'));

    const result = await createOrUpdateFileByBatch({ files });

    expect(result).toStrictEqual({
      error: expect.any(SqliteError),
    });
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Error batch creating or updating files',
        count: 1,
      }),
    );
  });
});
