import { Container, ContainerBuilder } from 'diod';
import { AllParentFoldersStatusIsExists } from '../../../../../context/virtual-drive/folders/application/AllParentFoldersStatusIsExists';
import { FolderCreator } from '../../../../../context/virtual-drive/folders/application/FolderCreator';
import { FolderCreatorFromOfflineFolder } from '../../../../../context/virtual-drive/folders/application/FolderCreatorFromOfflineFolder';
import { FolderDeleter } from '../../../../../context/virtual-drive/folders/application/FolderDeleter';
import { FolderMover } from '../../../../../context/virtual-drive/folders/application/FolderMover';
import { FolderPathUpdater } from '../../../../../context/virtual-drive/folders/application/FolderPathUpdater';
import { FolderRenamer } from '../../../../../context/virtual-drive/folders/application/FolderRenamer';
import { FolderRepositoryInitializer } from '../../../../../context/virtual-drive/folders/application/FolderRepositoryInitializer';
import { FoldersByParentPathLister } from '../../../../../context/virtual-drive/folders/application/FoldersByParentPathLister';
import { ParentFolderFinder } from '../../../../../context/virtual-drive/folders/application/ParentFolderFinder';
import { SingleFolderMatchingFinder } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingFinder';
import { SingleFolderMatchingSearcher } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingSearcher';
import { Folder } from '../../../../../context/virtual-drive/folders/domain/Folder';
import { FuseLocalFileSystem } from '../../../../../context/virtual-drive/folders/infrastructure/FuseLocalFileSystem';
import { HttpRemoteFileSystem } from '../../../../../context/virtual-drive/folders/infrastructure/HttpRemoteFileSystem';
import { MainProcessSyncFolderMessenger } from '../../../../../context/virtual-drive/folders/infrastructure/SyncMessengers/MainProcessSyncFolderMessenger';
import { DependencyInjectionHttpClientsProvider } from '../../common/clients';
import { FolderRepository } from '../../../../../context/virtual-drive/folders/domain/FolderRepository';
import { SyncFolderMessenger } from '../../../../../context/virtual-drive/folders/domain/SyncFolderMessenger';
import { RemoteFileSystem } from '../../../../../context/virtual-drive/folders/domain/file-systems/RemoteFileSystem';
import { LocalFileSystem } from '../../../../../context/virtual-drive/folders/domain/file-systems/LocalFileSystem';
import { EventBus } from '../../../../../context/virtual-drive/shared/domain/EventBus';

export async function registerFolderServices(
  builder: ContainerBuilder,
  sharedInfrastructure: Container,
  initialFolders: Array<Folder>
): Promise<void> {
  const repository = sharedInfrastructure.get(FolderRepository);

  const folderRepositoryInitiator = new FolderRepositoryInitializer(repository);

  await folderRepositoryInitiator.run(initialFolders);

  const clients = DependencyInjectionHttpClientsProvider.get();

  builder.register(SyncFolderMessenger).use(MainProcessSyncFolderMessenger);
  // TODO: can be private?

  builder
    .register(RemoteFileSystem)
    .useFactory(() => {
      return new HttpRemoteFileSystem(
        // @ts-ignore
        clients.drive,
        clients.newDrive
      );
    })
    .private();

  builder.register(LocalFileSystem).use(FuseLocalFileSystem);

  builder
    .register(ParentFolderFinder)
    .useFactory(() => new ParentFolderFinder(repository));

  builder
    .register(SingleFolderMatchingFinder)
    .useFactory(() => new SingleFolderMatchingFinder(repository));

  builder
    .register(SingleFolderMatchingSearcher)
    .useFactory(() => new SingleFolderMatchingSearcher(repository));

  builder
    .register(FoldersByParentPathLister)
    .useFactory(
      (c) =>
        new FoldersByParentPathLister(
          c.get(SingleFolderMatchingFinder),
          repository
        )
    );

  builder
    .register(FolderMover)
    .useFactory(
      (c) =>
        new FolderMover(
          repository,
          c.get(RemoteFileSystem),
          c.get(ParentFolderFinder)
        )
    );

  builder
    .register(FolderRenamer)
    .useFactory(
      (c) =>
        new FolderRenamer(
          repository,
          c.get(RemoteFileSystem),
          sharedInfrastructure.get(EventBus),
          c.get(SyncFolderMessenger)
        )
    );
  builder
    .register(FolderPathUpdater)
    .useFactory(
      (c) =>
        new FolderPathUpdater(
          repository,
          c.get(FolderMover),
          c.get(FolderRenamer)
        )
    );

  builder
    .register(AllParentFoldersStatusIsExists)
    .useFactory(() => new AllParentFoldersStatusIsExists(repository));

  builder
    .register(FolderCreatorFromOfflineFolder)
    .useFactory(
      (c) =>
        new FolderCreatorFromOfflineFolder(
          repository,
          c.get(RemoteFileSystem),
          sharedInfrastructure.get(EventBus),
          c.get(SyncFolderMessenger)
        )
    );
  builder
    .register(FolderCreator)
    .useFactory(
      (c) =>
        new FolderCreator(
          repository,
          c.get(ParentFolderFinder),
          c.get(RemoteFileSystem),
          sharedInfrastructure.get(EventBus)
        )
    );
  builder
    .register(FolderDeleter)
    .useFactory(
      (c) =>
        new FolderDeleter(
          repository,
          c.get(RemoteFileSystem),
          c.get(LocalFileSystem),
          c.get(AllParentFoldersStatusIsExists)
        )
    );
}
