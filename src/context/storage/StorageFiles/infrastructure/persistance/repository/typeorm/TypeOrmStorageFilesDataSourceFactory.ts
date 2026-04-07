import { DataSource } from 'typeorm';
import { TypeOrmStorageFile } from './entities/TypeOrmStorageFile';
import { PATHS } from '../../../../../../../core/electron/paths';

export class TypeOrmStorageFilesDataSourceFactory {
  static async create(): Promise<DataSource> {
    const s = new DataSource({
      type: 'better-sqlite3',
      database: PATHS.DATABASE,
      logging: false,
      synchronize: true,
      entities: [TypeOrmStorageFile],
    });

    return s.initialize();
  }
}
