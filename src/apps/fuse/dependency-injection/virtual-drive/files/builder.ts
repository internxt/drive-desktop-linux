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
import { DependencyInjectionMainProcessStorageSdk } from '../../../../shared/dependency-injection/main/DependencyInjectionMainProcessStorageSdk';
import { DependencyInjectionMainProcessUserProvider } from '../../../../shared/dependency-injection/main/DependencyInjectionMainProcessUserProvider';

export async function registerFilesServices(
  builder: ContainerBuilder,
  hydrationContainer: Container,
  initialFiles: Array<File>
): Promise<void> {
  const repository = hydrationContainer.get(FileRepository);

  const user = DependencyInjectionMainProcessUserProvider.get();
  const sdk = await DependencyInjectionMainProcessStorageSdk.get();
  const clients = DependencyInjectionHttpClientsProvider.get();

  const repositoryPopulator = new FileRepositoryInitializer(repository);

  await repositoryPopulator.run(initialFiles);

  builder.register(SyncFileMessenger).use(MainProcessSyncFileMessenger);

  builder
    .register(FirstsFileSearcher)
    .useFactory(() => new FirstsFileSearcher(repository));
  builder
    .register(SingleFileMatchingSearcher)
    .useFactory(() => new SingleFileMatchingSearcher(repository));

  builder
    .register(FilesByFolderPathSearcher)
    .useFactory(
      () =>
        new FilesByFolderPathSearcher(
          repository,
          hydrationContainer.get(SingleFolderMatchingFinder)
        )
    );

  builder
    .register(RemoteFileSystem)
    .useFactory(
      () => new SDKRemoteFileSystem(sdk, clients, crypt, user.bucket)
    );

  builder.register(LocalFileSystem).use(FuseLocalFileSystem);

  builder.register(FilePathUpdater).useFactory((c) => {
    return new FilePathUpdater(
      c.get(RemoteFileSystem),
      c.get(LocalFileSystem),
      repository,
      c.get(SingleFileMatchingSearcher),
      hydrationContainer.get(ParentFolderFinder),
      hydrationContainer.get(EventBus)
    );
  });

  builder.register(SameFileWasMoved).useFactory((c) => {
    return new SameFileWasMoved(
      c.get(SingleFileMatchingSearcher),
      c.get(LocalFileSystem),
      hydrationContainer.get(EventRepository)
    );
  });

  builder.register(FileDeleter).useFactory((c) => {
    return new FileDeleter(
      c.get(RemoteFileSystem),
      c.get(LocalFileSystem),
      repository,
      c.get(AllParentFoldersStatusIsExists),
      c.get(SyncFileMessenger)
    );
  });

  builder.register(FileCreator).useFactory((c) => {
    return new FileCreator(
      c.get(RemoteFileSystem),
      repository,
      hydrationContainer.get(ParentFolderFinder),
      c.get(FileDeleter),
      hydrationContainer.get(EventBus),
      c.get(SyncFileMessenger)
    );
  });

  builder.register(FilesSearcherByPartialMatch).useFactory(() => {
    return new FilesSearcherByPartialMatch(repository);
  });

  builder.register(FileOverrider).useFactory((c) => {
    return new FileOverrider(
      c.get(RemoteFileSystem),
      repository,
      hydrationContainer.get(EventBus)
    );
  });

  builder
    .register(CreateFileOnOfflineFileUploaded)
    .useFactory((c) => {
      return new CreateFileOnOfflineFileUploaded(
        c.get(FileCreator),
        c.get(FileOverrider)
      );
    })
    .addTag('event-handler');
}
