import { Environment } from '@internxt/inxt-js';
import { ContainerBuilder } from 'diod';
import { app } from 'electron';
import path from 'path';
import { StorageCacheDeleter } from '../../../../context/storage/StorageFiles/application/delete/StorageCacheDeleter';
import { StorageClearer } from '../../../../context/storage/StorageFiles/application/delete/StorageClearer';
import { StorageFileDeleter } from '../../../../context/storage/StorageFiles/application/delete/StorageFileDeleter';
import { MakeStorageFileAvaliableOffline } from '../../../../context/storage/StorageFiles/application/offline/MakeStorageFileAvaliableOffline';
import { StorageFileIsAvailableOffline } from '../../../../context/storage/StorageFiles/application/offline/StorageFileIsAvailableOffline';
import { StorageFileChunkReader } from '../../../../context/storage/StorageFiles/application/read/StorageFileChunkReader';
import { StorageRemoteChangesSyncher } from '../../../../context/storage/StorageFiles/application/sync/StorageRemoteChangesSyncher';
import { StorageFileCache } from '../../../../context/storage/StorageFiles/domain/StorageFileCache';
import { StorageFilesRepository } from '../../../../context/storage/StorageFiles/domain/StorageFilesRepository';
import { DownloaderHandlerFactory } from '../../../../context/storage/StorageFiles/domain/download/DownloaderHandlerFactory';
import { EnvironmentFileDownloaderHandlerFactory } from '../../../../context/storage/StorageFiles/infrastructure/download/EnvironmentRemoteFileContentsManagersFactory';
import { InMemoryStorageFileCache } from '../../../../context/storage/StorageFiles/infrastructure/persistance/cache/InMemoryStorageFileCache';
import { TypeOrmAndNodeFsStorageFilesRepository } from '../../../../context/storage/StorageFiles/infrastructure/persistance/repository/typeorm/TypeOrmAndNodeFsStorageFilesRepository';
import { TypeOrmStorageFilesDataSourceFactory } from '../../../../context/storage/StorageFiles/infrastructure/persistance/repository/typeorm/TypeOrmStorageFilesDataSourceFactory';
import { DependencyInjectionUserProvider } from '../../../shared/dependency-injection/DependencyInjectionUserProvider';
import { CacheStorageFile } from '../../../../context/storage/StorageFiles/application/offline/CacheStorageFile';

export async function registerStorageFilesServices(
  builder: ContainerBuilder
): Promise<void> {
  // Infra

  const appData = app.getPath('appData');
  const local = path.join(appData, 'internxt-drive', 'downloaded');

  const user = DependencyInjectionUserProvider.get();

  const dataSource = await TypeOrmStorageFilesDataSourceFactory.create();

  const repo = new TypeOrmAndNodeFsStorageFilesRepository(local, dataSource);
  await repo.init();

  builder.register(StorageFilesRepository).useInstance(repo).private();

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
  builder.registerAndUse(MakeStorageFileAvaliableOffline);
  builder.registerAndUse(CacheStorageFile);
  builder.registerAndUse(StorageFileChunkReader);
  builder.registerAndUse(StorageCacheDeleter);
  builder.registerAndUse(StorageFileDeleter);
  builder.registerAndUse(StorageClearer);
  builder.registerAndUse(StorageRemoteChangesSyncher);
}
