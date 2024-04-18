import { Container, ContainerBuilder } from 'diod';
import crypt from '../../../../../context/shared/infrastructure/crypt';
import { FileCreator } from '../../../../../context/virtual-drive/files/application/FileCreator';
import { FileDeleter } from '../../../../../context/virtual-drive/files/application/FileDeleter';
import { FilePathUpdater } from '../../../../../context/virtual-drive/files/application/FilePathUpdater';
import { FileRepositoryInitializer } from '../../../../../context/virtual-drive/files/application/FileRepositoryInitializer';
import { FilesByFolderPathSearcher } from '../../../../../context/virtual-drive/files/application/FilesByFolderPathSearcher';
import { FirstsFileSearcher } from '../../../../../context/virtual-drive/files/application/FirstsFileSearcher';
import { SameFileWasMoved } from '../../../../../context/virtual-drive/files/application/SameFileWasMoved';
import { SingleFileMatchingSearcher } from '../../../../../context/virtual-drive/files/application/SingleFileMatchingSearcher';
import { CreateFileOnOfflineFileUploaded } from '../../../../../context/virtual-drive/files/application/event-subsribers/CreateFileOnOfflineFileUplodaded';
import { FileOverrider } from '../../../../../context/virtual-drive/files/application/override/FileOverrider';
import { FilesSearcherByPartialMatch } from '../../../../../context/virtual-drive/files/application/search-all/FilesSearcherByPartialMatch';
import { File } from '../../../../../context/virtual-drive/files/domain/File';
import { FileRepository } from '../../../../../context/virtual-drive/files/domain/FileRepository';
import { SyncFileMessenger } from '../../../../../context/virtual-drive/files/domain/SyncFileMessenger';
import { LocalFileSystem } from '../../../../../context/virtual-drive/files/domain/file-systems/LocalFileSystem';
import { RemoteFileSystem } from '../../../../../context/virtual-drive/files/domain/file-systems/RemoteFileSystem';
import { FuseLocalFileSystem } from '../../../../../context/virtual-drive/files/infrastructure/FuseLocalFileSystem';
import { SDKRemoteFileSystem } from '../../../../../context/virtual-drive/files/infrastructure/SDKRemoteFileSystem';
import { MainProcessSyncFileMessenger } from '../../../../../context/virtual-drive/files/infrastructure/SyncFileMessengers/MainProcessSyncFileMessenger';
import { AllParentFoldersStatusIsExists } from '../../../../../context/virtual-drive/folders/application/AllParentFoldersStatusIsExists';
import { ParentFolderFinder } from '../../../../../context/virtual-drive/folders/application/ParentFolderFinder';
import { SingleFolderMatchingFinder } from '../../../../../context/virtual-drive/folders/application/SingleFolderMatchingFinder';
import { EventBus } from '../../../../../context/virtual-drive/shared/domain/EventBus';
import { EventRepository } from '../../../../../context/virtual-drive/shared/domain/EventRepository';
import { DependencyInjectionHttpClientsProvider } from '../../common/clients';
import { DependencyInjectionStorageSdk } from '../../common/sdk';
import { DependencyInjectionUserProvider } from '../../common/user';
import { FilesContainer } from './FilesContainer';

export async function buildFilesContainer(
  initialFiles: Array<File>,
  fuseBuilder: ContainerBuilder,
  hydrationContainer: Container
): Promise<{
  old: FilesContainer;
  c: Container;
}> {
  const repository = hydrationContainer.get(FileRepository);

  const user = DependencyInjectionUserProvider.get();
  const sdk = await DependencyInjectionStorageSdk.get();
  const clients = DependencyInjectionHttpClientsProvider.get();

  const repositoryPopulator = new FileRepositoryInitializer(repository);

  await repositoryPopulator.run(initialFiles);

  fuseBuilder.register(SyncFileMessenger).use(MainProcessSyncFileMessenger);

  fuseBuilder
    .register(FirstsFileSearcher)
    .useFactory(() => new FirstsFileSearcher(repository));
  fuseBuilder
    .register(SingleFileMatchingSearcher)
    .useFactory(() => new SingleFileMatchingSearcher(repository));

  fuseBuilder
    .register(FilesByFolderPathSearcher)
    .useFactory(
      () =>
        new FilesByFolderPathSearcher(
          repository,
          hydrationContainer.get(SingleFolderMatchingFinder)
        )
    );

  fuseBuilder
    .register(RemoteFileSystem)
    .useFactory(
      () => new SDKRemoteFileSystem(sdk, clients, crypt, user.bucket)
    );

  fuseBuilder.register(LocalFileSystem).use(FuseLocalFileSystem);

  fuseBuilder.register(FilePathUpdater).useFactory((c) => {
    return new FilePathUpdater(
      c.get(RemoteFileSystem),
      c.get(LocalFileSystem),
      repository,
      c.get(SingleFileMatchingSearcher),
      hydrationContainer.get(ParentFolderFinder),
      hydrationContainer.get(EventBus)
    );
  });

  fuseBuilder.register(SameFileWasMoved).useFactory((c) => {
    return new SameFileWasMoved(
      c.get(SingleFileMatchingSearcher),
      c.get(LocalFileSystem),
      hydrationContainer.get(EventRepository)
    );
  });

  fuseBuilder.register(FileDeleter).useFactory((c) => {
    return new FileDeleter(
      c.get(RemoteFileSystem),
      c.get(LocalFileSystem),
      repository,
      c.get(AllParentFoldersStatusIsExists),
      c.get(SyncFileMessenger)
    );
  });

  fuseBuilder.register(FileCreator).useFactory((c) => {
    return new FileCreator(
      c.get(RemoteFileSystem),
      repository,
      hydrationContainer.get(ParentFolderFinder),
      c.get(FileDeleter),
      hydrationContainer.get(EventBus),
      c.get(SyncFileMessenger)
    );
  });

  fuseBuilder.register(FilesSearcherByPartialMatch).useFactory((c) => {
    return new FilesSearcherByPartialMatch(repository);
  });

  fuseBuilder.register(FileOverrider).useFactory((c) => {
    return new FileOverrider(
      c.get(RemoteFileSystem),
      repository,
      hydrationContainer.get(EventBus)
    );
  });

  fuseBuilder
    .register(CreateFileOnOfflineFileUploaded)
    .useFactory((c) => {
      return new CreateFileOnOfflineFileUploaded(
        c.get(FileCreator),
        c.get(FileOverrider)
      );
    })
    .addTag('event-handler');

  const c = fuseBuilder.build();

  const old = {
    filesByFolderPathNameLister: c.get(FilesByFolderPathSearcher),
    filesSearcher: c.get(FirstsFileSearcher),
    filePathUpdater: c.get(FilePathUpdater),
    sameFileWasMoved: c.get(SameFileWasMoved),
    fileCreator: c.get(FileCreator),
    fileDeleter: c.get(FileDeleter),
    syncFileMessenger: c.get(SyncFileMessenger),
    filesSearcherByPartialMatch: c.get(FilesSearcherByPartialMatch),
    // event handlers
    createFileOnOfflineFileUploaded: c.get(CreateFileOnOfflineFileUploaded),
  };

  return {
    old,
    c,
  };
}
