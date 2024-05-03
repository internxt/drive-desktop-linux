import { ContainerBuilder } from 'diod';
import { StorageFolderDeleter } from '../../../../context/storage/StorageFolders/application/delete/StorageFolderDeleter';
import { MakeFolderAvaliableOffline } from '../../../../context/storage/StorageFolders/application/offline/MakeFolderAvaliableOffline';

export function registerStorageFoldersServices(
  builder: ContainerBuilder
): void {
  // Services
  builder.registerAndUse(MakeFolderAvaliableOffline);

  builder.registerAndUse(StorageFolderDeleter);
}
