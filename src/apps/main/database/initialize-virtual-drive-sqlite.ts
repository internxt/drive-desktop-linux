import { AppDataSource } from './data-source';

type SqliteQueryExecutor = {
  isInitialized: boolean;
  query: (statement: string) => Promise<unknown>;
};

type Props = {
  dataSource?: SqliteQueryExecutor;
};

const SQLITE_BOOTSTRAP_STATEMENTS = [
  'PRAGMA busy_timeout=5000;',
  'PRAGMA journal_mode=WAL;',
  'PRAGMA temp_store=MEMORY;',
  'PRAGMA foreign_keys=ON;',
  'PRAGMA wal_autocheckpoint=1000;',
  'PRAGMA mmap_size=268435456;',
  `CREATE TABLE IF NOT EXISTS drive_directory_state (
    folder_id INTEGER NOT NULL,
    status_scope TEXT NOT NULL,
    children_loaded_at TEXT NULL,
    children_last_error_at TEXT NULL,
    fetch_state TEXT NOT NULL DEFAULT 'idle',
    PRIMARY KEY (folder_id, status_scope)
  );`,
  'CREATE INDEX IF NOT EXISTS idx_drive_file_folder_status_updated ON drive_file(folderId, status, updatedAt);',
  'CREATE INDEX IF NOT EXISTS idx_drive_file_status_updated ON drive_file(status, updatedAt);',
  'CREATE INDEX IF NOT EXISTS idx_drive_folder_parent_status_updated ON drive_folder(parentId, status, updatedAt);',
  'CREATE INDEX IF NOT EXISTS idx_drive_folder_status_updated ON drive_folder(status, updatedAt);',
];

export async function initializeVirtualDriveSqlite({ dataSource = AppDataSource }: Props = {}) {
  if (!dataSource.isInitialized) {
    return;
  }

  for (const statement of SQLITE_BOOTSTRAP_STATEMENTS) {
    await dataSource.query(statement);
  }
}
