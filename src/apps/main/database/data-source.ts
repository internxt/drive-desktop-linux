import { DataSource } from 'typeorm';
import { DriveFile } from './entities/DriveFile';
import { DriveFolder } from './entities/DriveFolder';
import { ScannedItem } from './entities/ScannedItem';
import { TypeOrmStorageFile } from '../../../context/storage/StorageFiles/infrastructure/persistance/repository/typeorm/entities/TypeOrmStorageFile';
import { logger } from '@internxt/drive-desktop-core/build/backend';
import { PATHS } from '../../../core/electron/paths';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: PATHS.DATABASE,
  logging: false,
  synchronize: true,
  entities: [DriveFile, DriveFolder, ScannedItem, TypeOrmStorageFile],
});

logger.debug({ msg: `Using database file at ${PATHS.DATABASE}` });

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
