import { Environment } from '@internxt/inxt-js';
import { ContainerBuilder } from 'diod';
import { StorageClearer } from '../../../../context/storage/StorageFiles/application/delete/StorageClearer';
import { StorageFileDeleter } from '../../../../context/storage/StorageFiles/application/delete/StorageFileDeleter';
import { MakeStorageFileAvaliableOffline } from '../../../../context/storage/StorageFiles/application/offline/MakeStorageFileAvaliableOffline';
import { StorageFileIsAvailableOffline } from '../../../../context/storage/StorageFiles/application/offline/StorageFileIsAvailableOffline';
import { StorageRemoteChangesSyncher } from '../../../../context/storage/StorageFiles/application/sync/StorageRemoteChangesSyncher';
import { StorageFilesRepository } from '../../../../context/storage/StorageFiles/domain/StorageFilesRepository';
import { DownloaderHandlerFactory } from '../../../../context/storage/StorageFiles/domain/download/DownloaderHandlerFactory';
import { EnvironmentFileDownloaderHandlerFactory } from '../../../../context/storage/StorageFiles/infrastructure/download/EnvironmentRemoteFileContentsManagersFactory';
import { TypeOrmAndNodeFsStorageFilesRepository } from '../../../../context/storage/StorageFiles/infrastructure/persistance/repository/typeorm/TypeOrmAndNodeFsStorageFilesRepository';
import { TypeOrmStorageFilesDataSourceFactory } from '../../../../context/storage/StorageFiles/infrastructure/persistance/repository/typeorm/TypeOrmStorageFilesDataSourceFactory';
import { DependencyInjectionUserProvider } from '../../../shared/dependency-injection/DependencyInjectionUserProvider';
import { PATHS } from '../../../../core/electron/paths';

export async function registerStorageFilesServices(builder: ContainerBuilder): Promise<void> {
  // Infra

  const user = DependencyInjectionUserProvider.get();

  const dataSource = await TypeOrmStorageFilesDataSourceFactory.create();

  const repo = new TypeOrmAndNodeFsStorageFilesRepository(PATHS.DOWNLOADED, dataSource);
  await repo.init();

  builder.register(StorageFilesRepository).useInstance(repo);

  builder
    .register(DownloaderHandlerFactory)
    .useFactory((c) => new EnvironmentFileDownloaderHandlerFactory(c.get(Environment), user.bucket));

  // Services

  builder.registerAndUse(StorageFileIsAvailableOffline);
  builder.registerAndUse(MakeStorageFileAvaliableOffline);
  builder.registerAndUse(StorageFileDeleter);
  builder.registerAndUse(StorageClearer);
  builder.registerAndUse(StorageRemoteChangesSyncher);
}
