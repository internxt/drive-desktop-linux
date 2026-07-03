import { AppDataSource } from '../../../../../apps/main/database/data-source';

export type DirectoryStatusScope = 'EXISTS';

const DIRECTORY_STATE_TTL_MS = 30_000;

type StateProps = {
  folderId: number;
  statusScope: DirectoryStatusScope;
};

type Props = {
  dataSource?: typeof AppDataSource;
  ttlMs?: number;
};

export const DirectoryStateSqliteRepository = Symbol('DirectoryStateSqliteRepository');

export type DirectoryStateSqliteRepository = ReturnType<typeof createDirectoryStateSqliteRepository>;

export function createDirectoryStateSqliteRepository({
  dataSource = AppDataSource,
  ttlMs = DIRECTORY_STATE_TTL_MS,
}: Props = {}) {
  async function isFresh({ folderId, statusScope }: StateProps) {
    const rows = (await dataSource.query(
      'SELECT children_loaded_at FROM drive_directory_state WHERE folder_id = ? AND status_scope = ? LIMIT 1',
      [folderId, statusScope],
    )) as Array<{ children_loaded_at: string | null }>;

    const loadedAt = rows[0]?.children_loaded_at;

    if (!loadedAt) {
      return false;
    }

    return Date.now() - new Date(loadedAt).getTime() < ttlMs;
  }

  async function markLoaded({ folderId, statusScope }: StateProps) {
    await dataSource.query(
      `INSERT INTO drive_directory_state (folder_id, status_scope, children_loaded_at, children_last_error_at, fetch_state)
       VALUES (?, ?, ?, NULL, 'idle')
       ON CONFLICT(folder_id, status_scope)
       DO UPDATE SET children_loaded_at = excluded.children_loaded_at, children_last_error_at = NULL, fetch_state = 'idle'`,
      [folderId, statusScope, new Date().toISOString()],
    );
  }

  async function markError({ folderId, statusScope }: StateProps) {
    await dataSource.query(
      `INSERT INTO drive_directory_state (folder_id, status_scope, children_loaded_at, children_last_error_at, fetch_state)
       VALUES (?, ?, NULL, ?, 'error')
       ON CONFLICT(folder_id, status_scope)
       DO UPDATE SET children_last_error_at = excluded.children_last_error_at, fetch_state = 'error'`,
      [folderId, statusScope, new Date().toISOString()],
    );
  }

  async function clear() {
    await dataSource.query('DELETE FROM drive_directory_state');
  }

  return {
    isFresh,
    markLoaded,
    markError,
    clear,
  };
}
