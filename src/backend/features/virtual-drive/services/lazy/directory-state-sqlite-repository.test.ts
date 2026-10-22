import { call } from 'tests/vitest/utils.helper';
import { DirectoryStateRepository } from './directory-state-sqlite-repository';

describe('directory-state-sqlite-repository', () => {
  const queryMock =
    vi.fn<(statement: string, parameters?: Array<unknown>) => Promise<Array<{ children_loaded_at: string | null }>>>();
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
    queryMock.mockResolvedValue([{ children_loaded_at: new Date().toISOString() }]);

    const isFresh = await DirectoryStateRepository.isFresh({ dataSource, ...stateProps, ttlMs: 30_000 });

    expect(isFresh).toBe(true);
  });

  it('should report a directory as stale when its state exceeds the ttl', async () => {
    queryMock.mockResolvedValue([{ children_loaded_at: new Date(Date.now() - 30_001).toISOString() }]);

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
    ]);
  });

  it('should clear all directory states', async () => {
    await DirectoryStateRepository.clear({ dataSource });

    call(queryMock).toStrictEqual('DELETE FROM drive_directory_state');
  });
});
