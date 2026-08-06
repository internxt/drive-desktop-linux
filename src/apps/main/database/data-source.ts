import { DataSource } from 'typeorm';
import { DriveFile } from './entities/DriveFile';
import { DriveFolder } from './entities/DriveFolder';
import { ScannedItem } from './entities/ScannedItem';
import { TypeOrmStorageFile } from '../../../context/storage/StorageFiles/infrastructure/persistance/repository/typeorm/entities/TypeOrmStorageFile';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { PATHS } from '../../../core/electron/paths';

const SQLITE_BOOTSTRAP_STATEMENTS = [
  'PRAGMA journal_mode=WAL;',
  'PRAGMA synchronous=NORMAL;',
  'PRAGMA temp_store=MEMORY;',
  'PRAGMA foreign_keys=ON;',
  'PRAGMA busy_timeout=5000;',
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

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: PATHS.DATABASE,
  logging: false,
  synchronize: true,
  entities: [DriveFile, DriveFolder, ScannedItem, TypeOrmStorageFile],
});

logger.debug({ msg: `Using database file at ${PATHS.DATABASE}` });

export async function initializeVirtualDriveSqlite() {
  if (!AppDataSource.isInitialized) {
    return;
  }

  for (const statement of SQLITE_BOOTSTRAP_STATEMENTS) {
    try {
      await AppDataSource.query(statement);
    } catch (error) {
      logger.error({ msg: 'Error running SQLite bootstrap statement', statement, error });
    }
  }
}

export async function resetAppDataSourceOnLogout() {
  if (!AppDataSource.isInitialized) {
    return;
  }

  try {
    await AppDataSource.dropDatabase();
  } catch (error) {
    logger.error({ msg: 'Error dropping database on user logout', error });
  }

  try {
    await AppDataSource.destroy();
  } catch (error) {
    logger.error({ msg: 'Error destroying database connection on user logout', error });
  }
}
