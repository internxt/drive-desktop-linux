import { DataSource } from 'typeorm';
import { TypeOrmStorageFile } from './entities/TypeOrmStorageFile';
import { app } from 'electron';
import path from 'node:path';
import { PATHS } from '../../../../../../../core/electron/paths';

export class TypeOrmStorageFilesDataSourceFactory {
  static async create(): Promise<DataSource> {
    const dbPath = path.join(PATHS.INTERNXT_DRIVE, 'internxt_desktop.db');

    const s = new DataSource({
      type: 'better-sqlite3',
      database: dbPath,
      logging: false,
      synchronize: true,
      entities: [TypeOrmStorageFile],
    });

    return s.initialize();
  }
}
