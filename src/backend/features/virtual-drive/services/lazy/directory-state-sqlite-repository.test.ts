import { call } from 'tests/vitest/utils.helper';
import { DirectoryStateRepository } from './directory-state-sqlite-repository';
import { DirectoryStateRow } from './types';

describe('directory-state-sqlite-repository', () => {
  const queryMock = vi.fn<(statement: string, parameters?: Array<unknown>) => Promise<Array<DirectoryStateRow>>>();
  const stateProps = { folderId: 42, statusScope: 'EXISTS' as const };
  const dataSource = { query: queryMock };

  beforeEach(() => {
    queryMock.mockResolvedValue([]);
  });

  it('should report a directory as stale when it has not been loaded', async () => {
    const isFresh = await DirectoryStateRepository.isFresh({ dataSource, ...stateProps });

    expect(isFresh).toBe(false);
    call(queryMock).toStrictEqual([
      'SELECT children_loaded_at FROM drive_directory_state WHERE folder_id = ? AND status_scope = ? LIMIT 1',
      [42, 'EXISTS'],
    ]);
  });

  it('should report a directory as fresh when its state is within the ttl', async () => {
    queryMock.mockResolvedValue([
      { children_loaded_at: new Date().toISOString(), children_last_error_at: null, fetch_state: 'idle' },
    ]);

    const isFresh = await DirectoryStateRepository.isFresh({ dataSource, ...stateProps, ttlMs: 30_000 });

    expect(isFresh).toBe(true);
  });

  it('should report a directory as stale when its state exceeds the ttl', async () => {
    queryMock.mockResolvedValue([
      {
        children_loaded_at: new Date(Date.now() - 30_001).toISOString(),
        children_last_error_at: null,
        fetch_state: 'idle',
      },
    ]);

    const isFresh = await DirectoryStateRepository.isFresh({ dataSource, ...stateProps, ttlMs: 30_000 });

    expect(isFresh).toBe(false);
  });

  it('should record a successful directory load', async () => {
    await DirectoryStateRepository.markLoaded({ dataSource, ...stateProps });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('DO UPDATE SET children_loaded_at = excluded.children_loaded_at'),
      [42, 'EXISTS', expect.any(String)],
    );
  });

  it('should record a directory load error', async () => {
    await DirectoryStateRepository.markError({ dataSource, ...stateProps });

    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('VALUES (?, ?, NULL, ?,'), [
      42,
      'EXISTS',
      expect.any(String),
      'error',
    ]);
  });

  it('should read the successful load and stored failure state together', async () => {
    const state: DirectoryStateRow = {
      children_loaded_at: new Date(0).toISOString(),
      children_last_error_at: new Date().toISOString(),
      fetch_state: 'error_not_found',
    };
    queryMock.mockResolvedValue([state]);

    expect(await DirectoryStateRepository.getState({ dataSource, ...stateProps })).toStrictEqual(state);
    call(queryMock).toStrictEqual([
      'SELECT children_loaded_at, children_last_error_at, fetch_state FROM drive_directory_state WHERE folder_id = ? AND status_scope = ? LIMIT 1',
      [42, 'EXISTS'],
    ]);
  });

  it.each(['error_before_mutation', 'error_not_found'] as const)(
    'should persist failure classification %s',
    async (failureState) => {
      await DirectoryStateRepository.markError({ dataSource, ...stateProps, failureState });

      expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('fetch_state = excluded.fetch_state'), [
        42,
        'EXISTS',
        expect.any(String),
        failureState,
      ]);
    },
  );

  it('should invalidate a directory state', async () => {
    await DirectoryStateRepository.invalidate({ dataSource, ...stateProps });

    call(queryMock).toStrictEqual([
      'DELETE FROM drive_directory_state WHERE folder_id = ? AND status_scope = ?',
      [42, 'EXISTS'],
    ]);
  });

  it('should invalidate a directory state', async () => {
    await DirectoryStateRepository.invalidate({ dataSource, ...stateProps });

    call(queryMock).toStrictEqual([
      'DELETE FROM drive_directory_state WHERE folder_id = ? AND status_scope = ?',
      [42, 'EXISTS'],
    ]);
  });

  it('should invalidate a directory state', async () => {
    await DirectoryStateRepository.invalidate({ dataSource, ...stateProps });

    call(queryMock).toStrictEqual([
      'DELETE FROM drive_directory_state WHERE folder_id = ? AND status_scope = ?',
      [42, 'EXISTS'],
    ]);
  });

  it('should clear all directory states', async () => {
    await DirectoryStateRepository.clear({ dataSource });

    call(queryMock).toStrictEqual('DELETE FROM drive_directory_state');
  });
});
