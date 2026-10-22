import { AppDataSource } from '../../../../../apps/main/database/data-source';
import { DIRECTORY_STATE_TTL_MS } from './constants';
import type {
  DirectoryStateFreshnessProps,
  DirectoryStateErrorProps,
  DirectoryStateOperationProps,
  DirectoryStateRepositoryProps,
} from './types';

async function getState({ dataSource = AppDataSource, folderId, statusScope }: DirectoryStateOperationProps) {
  const rows = await dataSource.query(
    'SELECT children_loaded_at, children_last_error_at, fetch_state FROM drive_directory_state WHERE folder_id = ? AND status_scope = ? LIMIT 1',
    [folderId, statusScope],
  );
  return rows.at(0);
}

async function isFresh({
  dataSource = AppDataSource,
  folderId,
  statusScope,
  ttlMs = DIRECTORY_STATE_TTL_MS,
}: DirectoryStateFreshnessProps) {
  const rows = await dataSource.query(
    'SELECT children_loaded_at FROM drive_directory_state WHERE folder_id = ? AND status_scope = ? LIMIT 1',
    [folderId, statusScope],
  );
  const loadedAt = rows[0]?.children_loaded_at;

  if (!loadedAt) {
    return false;
  }

  return Date.now() - new Date(loadedAt).getTime() < ttlMs;
}

async function markLoaded({ dataSource = AppDataSource, folderId, statusScope }: DirectoryStateOperationProps) {
  await dataSource.query(
    `INSERT INTO drive_directory_state (folder_id, status_scope, children_loaded_at, children_last_error_at, fetch_state)
     VALUES (?, ?, ?, NULL, 'idle')
     ON CONFLICT(folder_id, status_scope)
     DO UPDATE SET children_loaded_at = excluded.children_loaded_at, children_last_error_at = NULL, fetch_state = 'idle'`,
    [folderId, statusScope, new Date().toISOString()],
  );
}

async function markError({
  dataSource = AppDataSource,
  folderId,
  statusScope,
  failureState = 'error',
}: DirectoryStateErrorProps) {
  await dataSource.query(
    `INSERT INTO drive_directory_state (folder_id, status_scope, children_loaded_at, children_last_error_at, fetch_state)
     VALUES (?, ?, NULL, ?, ?)
     ON CONFLICT(folder_id, status_scope)
     DO UPDATE SET children_last_error_at = excluded.children_last_error_at, fetch_state = excluded.fetch_state`,
    [folderId, statusScope, new Date().toISOString(), failureState],
  );
}

async function invalidate({ dataSource = AppDataSource, folderId, statusScope }: DirectoryStateOperationProps) {
  await dataSource.query('DELETE FROM drive_directory_state WHERE folder_id = ? AND status_scope = ?', [
    folderId,
    statusScope,
  ]);
}

async function clear({ dataSource = AppDataSource }: DirectoryStateRepositoryProps = {}) {
  await dataSource.query('DELETE FROM drive_directory_state');
}

export const DirectoryStateRepository = {
  getState,
  isFresh,
  markLoaded,
  markError,
  invalidate,
  clear,
};
