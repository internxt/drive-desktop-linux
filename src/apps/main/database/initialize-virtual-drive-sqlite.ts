import Database from 'better-sqlite3';
import { DataSource } from 'typeorm';
import { AppDataSource } from './data-source';

type SqliteQueryExecutor = {
  isInitialized: boolean;
  query: (statement: string, parameters?: unknown[]) => Promise<unknown>;
};

type Props = {
  dataSource?: DataSource;
};

type SqliteTableColumn = {
  name: string;
};

const DIRECTORY_STATE_TABLE_SQL = `CREATE TABLE IF NOT EXISTS drive_directory_state (
    folder_uuid TEXT NOT NULL,
    status_scope TEXT NOT NULL,
    children_loaded_at TEXT NULL,
    children_last_error_at TEXT NULL,
    fetch_state TEXT NOT NULL DEFAULT 'idle',
    PRIMARY KEY (folder_uuid, status_scope)
  );`;

const SQLITE_PRAGMA_STATEMENTS = [
  'PRAGMA busy_timeout=5000;',
  'PRAGMA journal_mode=WAL;',
  'PRAGMA temp_store=MEMORY;',
  'PRAGMA foreign_keys=ON;',
  'PRAGMA wal_autocheckpoint=1000;',
  'PRAGMA mmap_size=268435456;',
];

const SQLITE_INDEX_STATEMENTS = [
  'CREATE INDEX IF NOT EXISTS idx_drive_file_folder_uuid_status_updated ON drive_file(folderUuid, status, updatedAt);',
  'CREATE INDEX IF NOT EXISTS idx_drive_file_status_updated ON drive_file(status, updatedAt);',
  'CREATE INDEX IF NOT EXISTS idx_drive_folder_parent_uuid_status_updated ON drive_folder(parentUuid, status, updatedAt);',
  'CREATE INDEX IF NOT EXISTS idx_drive_folder_status_updated ON drive_folder(status, updatedAt);',
];

async function readTableColumns(dataSource: SqliteQueryExecutor, table: string): Promise<Array<SqliteTableColumn>> {
  return (await dataSource.query(`PRAGMA table_info(${table})`)) as Array<SqliteTableColumn>;
}

async function tableHasColumn(dataSource: SqliteQueryExecutor, table: string, column: string): Promise<boolean> {
  const columns = await readTableColumns(dataSource, table);
  return columns.some((entry) => entry.name === column);
}

type LegacySchemaProbe = {
  hasColumn: (table: string, column: string) => boolean | Promise<boolean>;
  dropTable: (table: string) => void | Promise<void>;
};

async function applyLegacyRemoteSyncMigration(probe: LegacySchemaProbe) {
  const legacyDirectoryState = await probe.hasColumn('drive_directory_state', 'folder_id');
  const legacyDriveFile = await probe.hasColumn('drive_file', 'folderId');
  const legacyDriveFolder = await probe.hasColumn('drive_folder', 'parentId');

  if (!legacyDirectoryState && !legacyDriveFile && !legacyDriveFolder) {
    return false;
  }

  if (legacyDirectoryState || legacyDriveFile || legacyDriveFolder) {
    await probe.dropTable('drive_directory_state');
  }

  if (legacyDriveFile) {
    await probe.dropTable('drive_file');
  }

  if (legacyDriveFolder) {
    await probe.dropTable('drive_folder');
  }

  return legacyDriveFile || legacyDriveFolder;
}

function readTableColumnsSync(db: Database.Database, table: string) {
  return db.prepare(`PRAGMA table_info(${table})`).all() as Array<SqliteTableColumn>;
}

function tableHasColumnSync(db: Database.Database, table: string, column: string) {
  return readTableColumnsSync(db, table).some((entry) => entry.name === column);
}

function migrateLegacyRemoteSyncSchemaSync(db: Database.Database) {
  const legacyDirectoryState = tableHasColumnSync(db, 'drive_directory_state', 'folder_id');
  const legacyDriveFile = tableHasColumnSync(db, 'drive_file', 'folderId');
  const legacyDriveFolder = tableHasColumnSync(db, 'drive_folder', 'parentId');

  if (!legacyDirectoryState && !legacyDriveFile && !legacyDriveFolder) {
    return;
  }

  if (legacyDirectoryState || legacyDriveFile || legacyDriveFolder) {
    db.exec('DROP TABLE IF EXISTS drive_directory_state');
  }

  if (legacyDriveFile) {
    db.exec('DROP TABLE IF EXISTS drive_file');
  }

  if (legacyDriveFolder) {
    db.exec('DROP TABLE IF EXISTS drive_folder');
  }
}

/** Runs before TypeORM opens the DB so upgrades need no user action. */
export function migrateLegacyRemoteSyncSchemaOnDisk({ databasePath }: { databasePath: string }) {
  const db = new Database(databasePath);

  try {
    migrateLegacyRemoteSyncSchemaSync(db);
  } finally {
    db.close();
  }
}

/** Drops pre-UUID sync tables; returns true when TypeORM entities must be recreated. */
async function migrateLegacyRemoteSyncSchema(dataSource: SqliteQueryExecutor) {
  return applyLegacyRemoteSyncMigration({
    hasColumn: (table, column) => tableHasColumn(dataSource, table, column),
    dropTable: async (table) => {
      await dataSource.query(`DROP TABLE IF EXISTS ${table}`);
    },
  });
}

export async function initializeVirtualDriveSqlite({ dataSource = AppDataSource }: Props = {}) {
  if (!dataSource.isInitialized) {
    return;
  }

  for (const statement of SQLITE_PRAGMA_STATEMENTS) {
    await dataSource.query(statement);
  }

  const needsEntitySync = await migrateLegacyRemoteSyncSchema(dataSource);

  if (needsEntitySync) {
    await dataSource.synchronize();
  }

  await dataSource.query(DIRECTORY_STATE_TABLE_SQL);

  for (const statement of SQLITE_INDEX_STATEMENTS) {
    await dataSource.query(statement);
  }
}

export { migrateLegacyRemoteSyncSchema, DIRECTORY_STATE_TABLE_SQL };
