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

    calls(queryMock).toHaveLength(12);
    expect(queryMock.mock.invocationCallOrder).toStrictEqual(
      [...queryMock.mock.invocationCallOrder].sort((a, b) => a - b),
    );
    expect(queryMock).toHaveBeenCalledWith('PRAGMA journal_mode=WAL;');
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('CREATE TABLE IF NOT EXISTS drive_directory_state'));
    expect(queryMock.mock.calls[0]).toStrictEqual(['PRAGMA journal_mode=WAL;']);
  });
});
