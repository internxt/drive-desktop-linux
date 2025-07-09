import { ContainerBuilder } from 'diod';
import { SimpleFileCreator } from '../../../../context/virtual-drive/files/application/create/SimpleFileCreator';
import { SimpleFileOverrider } from '../../../../context/virtual-drive/files/application/override/SimpleFileOverrider';
import { RemoteFileSystem } from '../../../../context/virtual-drive/files/domain/file-systems/RemoteFileSystem';
import crypt from '../../../../context/shared/infrastructure/crypt';
import { SDKRemoteFileSystem } from '../../../../context/virtual-drive/files/infrastructure/SDKRemoteFileSystem';
import { DependencyInjectionUserProvider } from '../../../shared/dependency-injection/DependencyInjectionUserProvider';
import { ParentFolderFinder } from '../../../../context/virtual-drive/folders/application/ParentFolderFinder';
import { FolderRepository } from '../../../../context/virtual-drive/folders/domain/FolderRepository';
import {
  InMemoryFolderRepository
} from '../../../../context/virtual-drive/folders/infrastructure/InMemoryFolderRepository';

export async function registerFilesServices(builder: ContainerBuilder) {
  // Infra
  const user = DependencyInjectionUserProvider.get();

  builder
    .register(RemoteFileSystem)
    .useFactory(
      () =>
        new SDKRemoteFileSystem(
          crypt,
          user.backupsBucket
        )
    )
    .private();

  builder
    .register(FolderRepository)
    .use(InMemoryFolderRepository)
    .asSingleton()
    .private();


  // Services
  builder.registerAndUse(ParentFolderFinder);
  builder.registerAndUse(SimpleFileCreator);
  builder.registerAndUse(SimpleFileOverrider);
}
