import { CreateFilePlaceholderEmitter } from 'workers/sync-engine/modules/files/application/CreateFilePlaceholderEmitter';
import crypt from '../../../utils/crypt';
import { ipcRendererSyncEngine } from '../../ipcRendererSyncEngine';
import { FileByPartialSearcher } from '../../modules/files/application/FileByPartialSearcher';
import { FileCreator } from '../../modules/files/application/FileCreator';
import { FileDeleter } from '../../modules/files/application/FileDeleter';
import { FileFinderByContentsId } from '../../modules/files/application/FileFinderByContentsId';
import { FilePathFromAbsolutePathCreator } from '../../modules/files/application/FilePathFromAbsolutePathCreator';
import { FilePathUpdater } from '../../modules/files/application/FilePathUpdater';
import { FileSearcher } from '../../modules/files/application/FileSearcher';
import { LocalRepositoryRepositoryRefresher } from '../../modules/files/application/LocalRepositoryRepositoryRefresher';
import { HttpFileRepository } from '../../modules/files/infrastructure/HttpFileRepository';
import { DependencyInjectionHttpClientsProvider } from '../common/clients';
import { DependencyInjectionEventBus } from '../common/eventBus';
import { DependencyInjectionLocalRootFolderPath } from '../common/localRootFolderPath';
import { DependencyInjectionTraverserProvider } from '../common/traverser';
import { DependencyInjectionUserProvider } from '../common/user';
import { FoldersContainer } from '../folders/FoldersContainer';
import { FilesContainer } from './FilesContainer';
import { FilePlaceholderCreatorFromContentsId } from 'workers/sync-engine/modules/files/application/FilePlaceholderCreatorFromContentsId';
import { FilePlaceholderCreator } from 'workers/sync-engine/modules/files/infrastructure/FilePlaceholderCreator';
import { CreateFilePlaceholderOnDeletionFailed } from 'workers/sync-engine/modules/files/application/CreateFilePlaceholderOnDeletionFailed';
import { DependencyInjectionVirtualDrive } from '../common/virtualDrive';

export async function buildFilesContainer(
  folderContainer: FoldersContainer
): Promise<{
  container: FilesContainer;
  subscribers: any;
}> {
  const clients = DependencyInjectionHttpClientsProvider.get();
  const traverser = DependencyInjectionTraverserProvider.get();
  const user = DependencyInjectionUserProvider.get();
  const localRootFolderPath = DependencyInjectionLocalRootFolderPath.get();
  const { bus: eventBus } = DependencyInjectionEventBus;
  const { virtualDrive } = DependencyInjectionVirtualDrive;

  const fileRepository = new HttpFileRepository(
    crypt,
    clients.drive,
    clients.newDrive,
    traverser,
    user.bucket,
    ipcRendererSyncEngine
  );

  await fileRepository.init();

  const fileFinderByContentsId = new FileFinderByContentsId(fileRepository);

  const localRepositoryRefresher = new LocalRepositoryRepositoryRefresher(
    ipcRendererSyncEngine,
    fileRepository
  );

  const placeholderCreator = new FilePlaceholderCreator(virtualDrive);

  const fileDeleter = new FileDeleter(
    fileRepository,
    fileFinderByContentsId,
    folderContainer.parentFoldersExistForDeletion,
    placeholderCreator,
    ipcRendererSyncEngine
  );

  const fileByPartialSearcher = new FileByPartialSearcher(fileRepository);

  const filePathUpdater = new FilePathUpdater(
    fileRepository,
    fileFinderByContentsId,
    folderContainer.folderFinder
  );

  const fileCreator = new FileCreator(
    fileRepository,
    folderContainer.folderFinder,
    eventBus
  );

  const filePathFromAbsolutePathCreator = new FilePathFromAbsolutePathCreator(
    localRootFolderPath
  );

  const fileSearcher = new FileSearcher(fileRepository);

  const createFilePlaceholderEmitter = new CreateFilePlaceholderEmitter(
    eventBus
  );

  const filePlaceholderCreatorFromContentsId =
    new FilePlaceholderCreatorFromContentsId(
      fileFinderByContentsId,
      placeholderCreator
    );

  const createFilePlaceholderOnDeletionFailed =
    new CreateFilePlaceholderOnDeletionFailed(
      filePlaceholderCreatorFromContentsId
    );

  const container: FilesContainer = {
    fileFinderByContentsId,
    localRepositoryRefresher: localRepositoryRefresher,
    fileDeleter,
    fileByPartialSearcher,
    filePathUpdater,
    fileCreator,
    filePathFromAbsolutePathCreator,
    fileSearcher,
    createFilePlaceholderEmitter: createFilePlaceholderEmitter,
    filePlaceholderCreatorFromContentsId: filePlaceholderCreatorFromContentsId,
    createFilePlaceholderOnDeletionFailed:
      createFilePlaceholderOnDeletionFailed,
  };

  return { container, subscribers: [] };
}
