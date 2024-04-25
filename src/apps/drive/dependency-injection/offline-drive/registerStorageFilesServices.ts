import { ContainerBuilder } from 'diod';
import { app } from 'electron';
import path from 'path';
import { StorageCacheDeleter } from '../../../../context/storage/StorageFiles/application/delete/StorageCacheDeleter';
import { StorageFileIsAvailableOffline } from '../../../../context/storage/StorageFiles/application/offline/StorageFileIsAvailableOffline';
import { StorageFileChunkReader } from '../../../../context/storage/StorageFiles/application/read/StorageFileChunkReader';
import { StorageFileCache } from '../../../../context/storage/StorageFiles/domain/StorageFileCache';
import { StorageFileRepository } from '../../../../context/storage/StorageFiles/domain/StorageFileRepository';
import { TypeOrmAndNodeFsStorageFilesRepository } from '../../../../context/storage/StorageFiles/infrastructure/persistance/repository/typeorm/TypeOrmAndNodeFsStorageFilesRepository';
import { StorageFileDeleter } from '../../../../context/storage/StorageFiles/application/delete/StorageFileDeleter';
import { StorageClearer } from '../../../../context/storage/StorageFiles/application/delete/StorageClearer';
import { DownloaderHandlerFactory } from '../../../../context/storage/StorageFiles/domain/download/DownloaderHandlerFactory';
import { EnvironmentFileDownloaderHandlerFactory } from '../../../../context/storage/StorageFiles/infrastructure/download/EnvironmentRemoteFileContentsManagersFactory';
import { Environment } from '@internxt/inxt-js';
import { DependencyInjectionMainProcessUserProvider } from '../../../shared/dependency-injection/main/DependencyInjectionMainProcessUserProvider';
import { TypeOrmStorageFilesDataSourceFactory } from '../../../../context/storage/StorageFiles/infrastructure/persistance/repository/typeorm/TypeOrmStorageFilesDataSourceFactory';
import { InMemoryStorageFileCache } from '../../../../context/storage/StorageFiles/infrastructure/persistance/cache/InMemoryStorageFileCache';

export async function registerStorageFilesServices(
  builder: ContainerBuilder
): Promise<void> {
  // Infra

  const appData = app.getPath('appData');
  const local = path.join(appData, 'internxt-drive', 'downloaded');

  const user = DependencyInjectionMainProcessUserProvider.get();

  const dataSource = await TypeOrmStorageFilesDataSourceFactory.create();

  const repo = new TypeOrmAndNodeFsStorageFilesRepository(local, dataSource);
  await repo.init();

  builder.register(StorageFileRepository).useInstance(repo).private();

  builder
    .register(DownloaderHandlerFactory)
    .useFactory(
      (c) =>
        new EnvironmentFileDownloaderHandlerFactory(
          c.get(Environment),
          user.bucket
        )
    );

  builder
    .register(StorageFileCache)
    .use(InMemoryStorageFileCache)
    .asSingleton()
    .private();

  // Services
  builder.registerAndUse(StorageFileIsAvailableOffline);
  builder.registerAndUse(StorageFileChunkReader);
  builder.registerAndUse(StorageCacheDeleter);
  builder.registerAndUse(StorageFileDeleter);
  builder.registerAndUse(StorageClearer);
}
