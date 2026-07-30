import { call, calls, partialSpyOn } from 'tests/vitest/utils.helper';
import { AppDataSource, initializeVirtualDriveSqlite, resetAppDataSourceOnLogout } from './data-source';

describe('data-source', () => {
  const dropDatabaseMock = partialSpyOn(AppDataSource, 'dropDatabase');
  const destroyMock = partialSpyOn(AppDataSource, 'destroy');
  const queryMock = partialSpyOn(AppDataSource, 'query');
  const isInitializedMock = vi.spyOn(AppDataSource, 'isInitialized', 'get');

  beforeEach(() => {
    isInitializedMock.mockReturnValue(true);
    dropDatabaseMock.mockResolvedValue(undefined);
    destroyMock.mockResolvedValue(undefined);
    queryMock.mockResolvedValue(undefined);
  });

  it('should drop the database before destroying the connection on logout', async () => {
    await resetAppDataSourceOnLogout();

    calls(dropDatabaseMock).toHaveLength(1);
    calls(destroyMock).toHaveLength(1);
    expect(dropDatabaseMock.mock.invocationCallOrder[0]).toBeLessThan(destroyMock.mock.invocationCallOrder[0]);
  });

  it('should skip cleanup when the data source is not initialized', async () => {
    isInitializedMock.mockReturnValue(false);

    await resetAppDataSourceOnLogout();

    calls(dropDatabaseMock).toHaveLength(0);
    calls(destroyMock).toHaveLength(0);
  });

  it('should destroy the connection even when dropping the database fails', async () => {
    dropDatabaseMock.mockRejectedValue(new Error('drop failed'));

    await resetAppDataSourceOnLogout();

    call(destroyMock).toStrictEqual([]);
  });

  it('should run the sqlite bootstrap statements when initialized', async () => {
    await initializeVirtualDriveSqlite();

    expect(queryMock).toHaveBeenCalledTimes(12);
  });

  it('should skip the sqlite bootstrap when the datasource is not initialized', async () => {
    isInitializedMock.mockReturnValue(false);

    await initializeVirtualDriveSqlite();

    calls(queryMock).toHaveLength(0);
  });

  it('should continue bootstrapping even if one statement fails', async () => {
    queryMock.mockRejectedValueOnce(new Error('boom')).mockResolvedValue(undefined);

    await initializeVirtualDriveSqlite();

    expect(queryMock).toHaveBeenCalledTimes(12);
  });
});
