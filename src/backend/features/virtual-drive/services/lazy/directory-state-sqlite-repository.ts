import { AppDataSource } from '../../../../../apps/main/database/data-source';
import { DIRECTORY_STATE_TTL_MS } from './constants';
import type {
  DirectoryStateFreshnessProps,
  DirectoryStateErrorProps,
  DirectoryStateOperationProps,
  DirectoryStateRepositoryProps,
  SqliteQueryExecutor,
} from './types';

async function getState({ dataSource = AppDataSource, folderUuid, statusScope }: DirectoryStateOperationProps) {
  const rows = await dataSource.query(
    'SELECT children_loaded_at, children_last_error_at, fetch_state FROM drive_directory_state WHERE folder_uuid = ? AND status_scope = ? LIMIT 1',
    [folderUuid, statusScope],
  );
  return rows.at(0);
}

async function isFresh({
  dataSource = AppDataSource,
  folderUuid,
  statusScope,
  ttlMs = DIRECTORY_STATE_TTL_MS,
}: DirectoryStateFreshnessProps) {
  const rows = await dataSource.query(
    'SELECT children_loaded_at FROM drive_directory_state WHERE folder_uuid = ? AND status_scope = ? LIMIT 1',
    [folderUuid, statusScope],
  );
  const loadedAt = rows[0]?.children_loaded_at;

  if (!loadedAt) {
    return false;
  }

  return Date.now() - new Date(loadedAt).getTime() < ttlMs;
}

async function markLoaded({ dataSource = AppDataSource, folderUuid, statusScope }: DirectoryStateOperationProps) {
  await dataSource.query(
    `INSERT INTO drive_directory_state (folder_uuid, status_scope, children_loaded_at, children_last_error_at, fetch_state)
     VALUES (?, ?, ?, NULL, 'idle')
     ON CONFLICT(folder_uuid, status_scope)
     DO UPDATE SET children_loaded_at = excluded.children_loaded_at, children_last_error_at = NULL, fetch_state = 'idle'`,
    [folderUuid, statusScope, new Date().toISOString()],
  );
}

async function markError({
  dataSource = AppDataSource,
  folderUuid,
  statusScope,
  failureState = 'error',
}: DirectoryStateErrorProps) {
  await dataSource.query(
    `INSERT INTO drive_directory_state (folder_uuid, status_scope, children_loaded_at, children_last_error_at, fetch_state)
     VALUES (?, ?, NULL, ?, ?)
     ON CONFLICT(folder_uuid, status_scope)
     DO UPDATE SET children_last_error_at = excluded.children_last_error_at, fetch_state = excluded.fetch_state`,
    [folderUuid, statusScope, new Date().toISOString(), failureState],
  );
}

async function getFreshDirectoryStates({
  dataSource = AppDataSource,
  statusScope = 'EXISTS',
  ttlMs = DIRECTORY_STATE_TTL_MS,
}: {
  dataSource?: SqliteQueryExecutor;
  statusScope?: string;
  ttlMs?: number;
} = {}): Promise<Map<string, Date>> {
  if (!dataSource.isInitialized) {
    return new Map();
  }

  const cutoff = new Date(Date.now() - ttlMs).toISOString();
  const rows = await dataSource.query(
    'SELECT folder_uuid, children_loaded_at FROM drive_directory_state WHERE status_scope = ? AND children_loaded_at > ?',
    [statusScope, cutoff],
  );

  const states = new Map<string, Date>();
  for (const row of rows) {
    if (row.folder_uuid === undefined || row.children_loaded_at === null) continue;
    states.set(row.folder_uuid, new Date(row.children_loaded_at));
  }

  return states;
}

async function invalidate({ dataSource = AppDataSource, folderUuid, statusScope }: DirectoryStateOperationProps) {
  await dataSource.query('DELETE FROM drive_directory_state WHERE folder_uuid = ? AND status_scope = ?', [
    folderUuid,
    statusScope,
  ]);
}

async function clear({ dataSource = AppDataSource }: DirectoryStateRepositoryProps = {}) {
  await dataSource.query('DELETE FROM drive_directory_state');
}

export const DirectoryStateRepository = {
  getState,
  isFresh,
  getFreshDirectoryStates,
  markLoaded,
  markError,
  invalidate,
  clear,
};
