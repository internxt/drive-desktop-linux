import { DataSource } from 'typeorm';
import { calls } from 'tests/vitest/utils.helper';
import {
  DIRECTORY_STATE_TABLE_SQL,
  initializeVirtualDriveSqlite,
  migrateLegacyRemoteSyncSchema,
} from './initialize-virtual-drive-sqlite';

describe('initialize-virtual-drive-sqlite', () => {
  const queryMock = vi.fn<(statement: string) => Promise<unknown>>();
  const synchronizeMock = vi.fn<() => Promise<void>>();
  let dataSource: DataSource;
  let props: NonNullable<Parameters<typeof initializeVirtualDriveSqlite>[0]>;

  beforeEach(() => {
    queryMock.mockResolvedValue(undefined);
    synchronizeMock.mockResolvedValue(undefined);
    dataSource = {
      isInitialized: true,
      query: queryMock,
      synchronize: synchronizeMock,
    } as unknown as DataSource;
    props = { dataSource };
  });

  it('should skip the bootstrap when the data source is not initialized', async () => {
    props = {
      dataSource: {
        isInitialized: false,
        query: queryMock,
        synchronize: synchronizeMock,
      } as unknown as DataSource,
    };

    await initializeVirtualDriveSqlite(props);

    calls(queryMock).toHaveLength(0);
  });

  it('should configure sqlite and create the directory state schema', async () => {
    queryMock.mockImplementation((statement) => {
      if (statement.startsWith('PRAGMA table_info(')) {
        return Promise.resolve([]);
      }

      return Promise.resolve(undefined);
    });

    await initializeVirtualDriveSqlite(props);

    expect(queryMock).toHaveBeenCalledWith('PRAGMA journal_mode=WAL;');
    expect(queryMock).toHaveBeenCalledWith(DIRECTORY_STATE_TABLE_SQL);
    expect(synchronizeMock).not.toHaveBeenCalled();
    expect(queryMock.mock.calls[0]).toStrictEqual(['PRAGMA busy_timeout=5000;']);
    expect(queryMock.mock.calls[1]).toStrictEqual(['PRAGMA journal_mode=WAL;']);
  });

  it('should drop legacy directory state tables keyed by folder_id', async () => {
    queryMock.mockImplementation((statement) => {
      if (statement === 'PRAGMA table_info(drive_directory_state)') {
        return Promise.resolve([{ name: 'folder_id' }, { name: 'status_scope' }]);
      }

      if (statement.startsWith('PRAGMA table_info(')) {
        return Promise.resolve([]);
      }

      return Promise.resolve(undefined);
    });

    await initializeVirtualDriveSqlite(props);

    expect(queryMock).toHaveBeenCalledWith('DROP TABLE IF EXISTS drive_directory_state');
    expect(queryMock).toHaveBeenCalledWith(DIRECTORY_STATE_TABLE_SQL);
    expect(synchronizeMock).not.toHaveBeenCalled();
  });

  it('should drop legacy drive_file and drive_folder tables and resynchronize entities', async () => {
    queryMock.mockImplementation((statement) => {
      if (statement === 'PRAGMA table_info(drive_file)') {
        return Promise.resolve([{ name: 'folderId' }]);
      }

      if (statement === 'PRAGMA table_info(drive_folder)') {
        return Promise.resolve([{ name: 'parentId' }]);
      }

      if (statement.startsWith('PRAGMA table_info(')) {
        return Promise.resolve([]);
      }

      return Promise.resolve(undefined);
    });

    await initializeVirtualDriveSqlite(props);

    expect(queryMock).toHaveBeenCalledWith('DROP TABLE IF EXISTS drive_directory_state');
    expect(queryMock).toHaveBeenCalledWith('DROP TABLE IF EXISTS drive_file');
    expect(queryMock).toHaveBeenCalledWith('DROP TABLE IF EXISTS drive_folder');
    expect(synchronizeMock).toHaveBeenCalledTimes(1);
  });

  it('should propagate WAL errors', async () => {
    const error = new Error('database is unavailable');
    queryMock.mockImplementation((statement) => {
      if (statement === 'PRAGMA journal_mode=WAL;') {
        return Promise.reject(error);
      }

      return Promise.resolve(undefined);
    });

    await expect(initializeVirtualDriveSqlite(props)).rejects.toBe(error);

    calls(queryMock).toHaveLength(2);
  });

  it('should propagate directory state schema errors', async () => {
    const error = new Error('schema creation failed');
    queryMock.mockImplementation((statement) => {
      if (statement.startsWith('PRAGMA table_info(')) {
        return Promise.resolve([]);
      }

      if (statement === DIRECTORY_STATE_TABLE_SQL) {
        return Promise.reject(error);
      }

      return Promise.resolve(undefined);
    });

    await expect(initializeVirtualDriveSqlite(props)).rejects.toBe(error);

    expect(queryMock).toHaveBeenCalledWith(DIRECTORY_STATE_TABLE_SQL);
  });
});

describe('migrateLegacyRemoteSyncSchema', () => {
  it('should no-op when tables are already on the uuid schema', async () => {
    const queryMock = vi.fn().mockImplementation((statement) => {
      if (statement.startsWith('PRAGMA table_info(')) {
        return Promise.resolve([{ name: 'folderUuid' }]);
      }

      return Promise.resolve(undefined);
    });

    const needsSync = await migrateLegacyRemoteSyncSchema({ isInitialized: true, query: queryMock });

    expect(needsSync).toBe(false);
    expect(queryMock).not.toHaveBeenCalledWith(expect.stringContaining('DROP TABLE'));
  });
});
