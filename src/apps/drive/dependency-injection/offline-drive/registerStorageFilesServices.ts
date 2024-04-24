import { ContainerBuilder } from 'diod';
import { app } from 'electron';
import path from 'path';
import { StorageCacheDeleter } from '../../../../context/storage/StorageFiles/application/delete/StorageCacheDeleter';
import { StorageFileIsAvailableOffline } from '../../../../context/storage/StorageFiles/application/find/StorageFileIsAvailableOffline';
import { StorageFileChunkReader } from '../../../../context/storage/StorageFiles/application/read/StorageFileChunkReader';
import { StorageFileWriter } from '../../../../context/storage/StorageFiles/application/write/StorageFileWriter';
import { StorageFileCache } from '../../../../context/storage/StorageFiles/domain/StorageFileCache';
import { StorageFileRepository } from '../../../../context/storage/StorageFiles/domain/StorageFileRepository';
import { NodeStorageFilesRepository } from '../../../../context/storage/StorageFiles/infrastructure/NodeLocalFilesRepository';
import { InMemoryStorageFileCache } from '../../../../context/storage/StorageFiles/infrastructure/cache/InMemoryStorageFileCache';
import { StorageFileDeleter } from '../../../../context/storage/StorageFiles/application/delete/StorageFileDeleter';
import { StorageClearer } from '../../../../context/storage/StorageFiles/application/delete/StorageClearer';

export async function registerStorageFilesServices(
  builder: ContainerBuilder
): Promise<void> {
  // Infra

  const appData = app.getPath('appData');
  const local = path.join(appData, 'internxt-drive', 'downloaded');

  const repo = new NodeStorageFilesRepository(local);
  await repo.init();

  builder.register(StorageFileRepository).useInstance(repo).private();

  builder
    .register(StorageFileCache)
    .use(InMemoryStorageFileCache)
    .asSingleton()
    .private();

  // Services
  builder.registerAndUse(StorageFileIsAvailableOffline);
  builder.registerAndUse(StorageFileChunkReader);
  builder.registerAndUse(StorageCacheDeleter);
  builder.registerAndUse(StorageFileWriter);
  builder.registerAndUse(StorageFileDeleter);
  builder.registerAndUse(StorageClearer);
}
