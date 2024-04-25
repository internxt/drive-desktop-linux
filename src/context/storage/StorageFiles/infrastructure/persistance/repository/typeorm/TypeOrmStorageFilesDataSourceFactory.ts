import { DataSource } from 'typeorm';
import { TypeOrmStorageFile } from './entities/TypeOrmStorageFile';
import { app } from 'electron';

export class TypeOrmStorageFilesDataSourceFactory {
  static create(): DataSource {
    const dbPath =
      app.getPath('appData') + '/internxt-drive/internxt_desktop.db';

    return new DataSource({
      type: 'better-sqlite3',
      database: dbPath,
      logging: false,
      synchronize: true,
      entities: [TypeOrmStorageFile],
    });
  }
}
