import { logger } from '@internxt/drive-desktop-core/build/backend';
import type { RemoteSyncedFolder } from '../../../../apps/main/remote-sync/helpers';
import { AppDataSource } from '../../../../apps/main/database/data-source';
import { createOrUpdateFolderByBatch } from './create-or-update-folder-by-batch';
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

describe('create-or-update-folder-by-batch', () => {
  const transactionMock = vi.mocked(AppDataSource.transaction);
  const loggerErrorMock = vi.mocked(logger.error);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return an empty result when the folders array is empty', async () => {
    const result = await createOrUpdateFolderByBatch({ folders: [] });

    expect(result).toStrictEqual({ data: [] });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('should upsert folders in batches and parse the result', async () => {
    const folders: RemoteSyncedFolder[] = Array.from({ length: 600 }, (_, index) => ({
      type: 'folder',
      id: index + 1,
      parentId: index % 2 === 0 ? 1 : null,
      bucket: index % 3 === 0 ? 'bucket' : null,
      userId: 1,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      uuid: `uuid-${index}`,
      plainName: `folder-${index}`,
      name: `folder-${index}`,
      status: 'EXISTS',
    }));

    const repository = {
      upsert: vi.fn().mockResolvedValue(undefined),
    };

    const manager = {
      getRepository: vi.fn().mockReturnValue(repository),
    };

    transactionMock.mockImplementation(async (...args: unknown[]) => {
      const runInTransaction = args[1] as (manager: unknown) => Promise<unknown>;
      await runInTransaction(manager);
    });

    const result = await createOrUpdateFolderByBatch({ folders });

    expect(repository.upsert).toHaveBeenCalledTimes(2);
    expect(repository.upsert).toHaveBeenNthCalledWith(
      1,
      expect.arrayContaining([
        expect.objectContaining({
          uuid: 'uuid-0',
          parentId: 1,
          bucket: 'bucket',
        }),
      ]),
      { conflictPaths: ['uuid'] },
    );
    expect(result).toStrictEqual({
      data: folders.map((data) => parseData({ data })),
    });
  });

  it('should log and return a sqlite error when the transaction fails', async () => {
    const folders: RemoteSyncedFolder[] = [
      {
        type: 'folder',
        id: 1,
        parentId: null,
        bucket: null,
        userId: 1,
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        uuid: 'uuid-1',
        plainName: 'folder-1',
        name: 'folder-1',
        status: 'EXISTS',
      },
    ];

    transactionMock.mockRejectedValue(new Error('boom'));

    const result = await createOrUpdateFolderByBatch({ folders });

    expect(result).toStrictEqual({
      error: expect.any(SqliteError),
    });
    expect(loggerErrorMock).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'Error batch creating or updating folders',
        count: 1,
      }),
    );
  });
});
