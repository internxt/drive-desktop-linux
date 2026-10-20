import { calls } from 'tests/vitest/utils.helper';
import { initializeVirtualDriveSqlite } from './initialize-virtual-drive-sqlite';

describe('initialize-virtual-drive-sqlite', () => {
  const queryMock = vi.fn<(statement: string) => Promise<unknown>>();
  let props: NonNullable<Parameters<typeof initializeVirtualDriveSqlite>[0]>;

  beforeEach(() => {
    queryMock.mockResolvedValue(undefined);
    props = {
      dataSource: {
        isInitialized: true,
        query: queryMock,
      },
    };
  });

  it('should skip the bootstrap when the data source is not initialized', async () => {
    props.dataSource!.isInitialized = false;

    await initializeVirtualDriveSqlite(props);

    calls(queryMock).toHaveLength(0);
  });

  it('should configure sqlite and create the directory state schema', async () => {
    await initializeVirtualDriveSqlite(props);

    calls(queryMock).toHaveLength(11);
    expect(queryMock.mock.invocationCallOrder).toStrictEqual(
      [...queryMock.mock.invocationCallOrder].sort((a, b) => a - b),
    );
    expect(queryMock).toHaveBeenCalledWith('PRAGMA journal_mode=WAL;');
    expect(queryMock).not.toHaveBeenCalledWith('PRAGMA synchronous=NORMAL;');
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS drive_directory_state'));
    expect(queryMock.mock.calls[0]).toStrictEqual(['PRAGMA busy_timeout=5000;']);
    expect(queryMock.mock.calls[1]).toStrictEqual(['PRAGMA journal_mode=WAL;']);
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
      if (statement.includes('CREATE TABLE IF NOT EXISTS drive_directory_state')) {
        return Promise.reject(error);
      }

      return Promise.resolve(undefined);
    });

    await expect(initializeVirtualDriveSqlite(props)).rejects.toBe(error);

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS drive_directory_state'));
  });
});
