import { ContainerBuilder } from 'diod';
import crypt from '../../../../context/shared/infrastructure/crypt';
import { FileCreator } from '../../../../context/virtual-drive/files/application/create/FileCreator';
import { FileTrasher } from '../../../../context/virtual-drive/files/application/trash/FileTrasher';
import { FilePathUpdater } from '../../../../context/virtual-drive/files/application/move/FilePathUpdater';
import { FilesByFolderPathSearcher } from '../../../../context/virtual-drive/files/application/search/FilesByFolderPathSearcher';
import { FirstsFileSearcher } from '../../../../context/virtual-drive/files/application/search/FirstsFileSearcher';
import { SingleFileMatchingSearcher } from '../../../../context/virtual-drive/files/application/search/SingleFileMatchingSearcher';
import { CreateFileOnTemporalFileUploaded } from '../../../../context/virtual-drive/files/application/create/CreateFileOnTemporalFileUploaded';
import { FileOverrider } from '../../../../context/virtual-drive/files/application/override/FileOverrider';
import { FilesSearcherByPartialMatch } from '../../../../context/virtual-drive/files/application/search-all/FilesSearcherByPartialMatch';
import { SyncFileMessenger } from '../../../../context/virtual-drive/files/domain/SyncFileMessenger';
import { RemoteFileSystem } from '../../../../context/virtual-drive/files/domain/file-systems/RemoteFileSystem';
import { SDKRemoteFileSystem } from '../../../../context/virtual-drive/files/infrastructure/SDKRemoteFileSystem';
import { MainProcessSyncFileMessenger } from '../../../../context/virtual-drive/files/infrastructure/SyncFileMessengers/MainProcessSyncFileMessenger';
import { DependencyInjectionMainProcessSdk } from '../../../shared/dependency-injection/main/DependencyInjectionMainProcessSdk';
import { DependencyInjectionUserProvider } from '../../../shared/dependency-injection/DependencyInjectionUserProvider';
import { AuthorizedClients } from '../../../shared/HttpClient/Clients';
import { FileRepository } from '../../../../context/virtual-drive/files/domain/FileRepository';
import { InMemoryFileRepository } from '../../../../context/virtual-drive/files/infrastructure/InMemoryFileRepository';
import { FileRepositorySynchronizer } from '../../../../context/virtual-drive/files/application/FileRepositorySynchronizer';
import { RetrieveAllFiles } from '../../../../context/virtual-drive/files/application/RetrieveAllFiles';
import { StorageFileDownloader } from '../../../../context/storage/StorageFiles/application/download/StorageFileDownloader/StorageFileDownloader';
import { SingleFileMatchingFinder } from '../../../../context/virtual-drive/files/application/SingleFileMatchingFinder';
import { FilesByPartialSearcher } from '../../../../context/virtual-drive/files/application/search/FilesByPartialSearcher';
import { FileContentsUpdater } from '../../../../context/virtual-drive/files/application/FileContentsUpdater';
import { LocalFileHandler } from '../../../../context/local/localFile/domain/LocalFileUploader';
import { EnvironmentLocalFileUploader } from '../../../../context/local/localFile/infrastructure/EnvironmentLocalFileUploader';
import { Environment } from '@internxt/inxt-js';
import { DependencyInjectionMnemonicProvider } from '../../../shared/dependency-injection/DependencyInjectionMnemonicProvider';
// import { StorageFilesRepository } from '../../../../context/storage/StorageFiles/domain/StorageFilesRepository';
// import { TypeOrmAndNodeFsStorageFilesRepository } from '../../../../context/storage/StorageFiles/infrastructure/persistance/repository/typeorm/TypeOrmAndNodeFsStorageFilesRepository';
// import {
//   EnvironmentLocalFileUploader
// } from '../../../../context/local/localFile/infrastructure/EnvironmentLocalFileUploader';

export async function registerFilesServices(
  builder: ContainerBuilder
): Promise<void> {
  // Infra

  builder
    .register(FileRepository)
    .use(InMemoryFileRepository)
    .asSingleton()
    .private();

  // builder.register(StorageFilesRepository).use(TypeOrmAndNodeFsStorageFilesRepository).asSingleton();

  const user = DependencyInjectionUserProvider.get();
  const sdk = await DependencyInjectionMainProcessSdk.getStorage();
  const trashSdk = await DependencyInjectionMainProcessSdk.getTrash();

  const mnemonic = DependencyInjectionMnemonicProvider.get();

  builder.register(SyncFileMessenger).use(MainProcessSyncFileMessenger);

  builder
    .register(RemoteFileSystem)
    .useFactory(
      (c) =>
        new SDKRemoteFileSystem(
          sdk,
          trashSdk,
          c.get(AuthorizedClients),
          crypt,
          user.bucket
        )
    );

  builder.register(LocalFileHandler).useFactory((c) => {
    const environment = new Environment({
      bridgeUrl: process.env.BRIDGE_URL,
      bridgeUser: user.bridgeUser,
      bridgePass: user.userId,
      encryptionKey: mnemonic,
    });

    return new EnvironmentLocalFileUploader(
      environment,
      user.bucket,
      c.get(AuthorizedClients).drive as any
    );
  });

  // Services
  builder.registerAndUse(StorageFileDownloader).private();

  //  builder.registerAndUse(EnvironmentLocalFileUploader);

  // builder.registerAndUse(StorageFilesRepository);

  builder.registerAndUse(FileContentsUpdater);

  builder.registerAndUse(FileRepositorySynchronizer);

  builder.registerAndUse(RetrieveAllFiles);

  builder.registerAndUse(FirstsFileSearcher);

  builder.registerAndUse(SingleFileMatchingSearcher);

  builder.registerAndUse(FilesByFolderPathSearcher);

  builder.registerAndUse(FilePathUpdater);

  builder.registerAndUse(FileTrasher);

  builder.registerAndUse(FileCreator);

  builder.registerAndUse(FilesSearcherByPartialMatch);

  builder.registerAndUse(FileOverrider);

  builder.registerAndUse(SingleFileMatchingFinder);

  builder.registerAndUse(FilesByPartialSearcher);

  // Event Handlers
  builder
    .registerAndUse(CreateFileOnTemporalFileUploaded)
    .addTag('event-handler');
}
