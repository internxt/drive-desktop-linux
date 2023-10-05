import { AllParentFoldersStatusIsExists } from '../../modules/folders/application/AllParentFoldersStatusIsExists';
import { FolderByPartialSearcher } from '../../modules/folders/application/FolderByPartialSearcher';
import { FolderCreator } from '../../modules/folders/application/FolderCreator';
import { FolderDeleter } from '../../modules/folders/application/FolderDeleter';
import { FolderFinder } from '../../modules/folders/application/FolderFinder';
import { FolderPathUpdater } from '../../modules/folders/application/FolderPathUpdater';
import { FolderSearcher } from '../../modules/folders/application/FolderSearcher';
import { OfflineFolderCreator } from '../../modules/folders/application/Offline/OfflineFolderCreator';
import { OfflineFolderPathUpdater } from '../../modules/folders/application/Offline/OfflineFolderPathUpdater';
import { SynchronizeOfflineModifications } from '../../modules/folders/application/SynchronizeOfflineModifications';
import { SynchronizeOfflineModificationsOnFolderCreated } from '../../modules/folders/application/SynchronizeOfflineModificationsOnFolderCreated';

export interface FoldersContainer {
  folderCreator: FolderCreator;
  folderFinder: FolderFinder;
  folderSearcher: FolderSearcher;
  folderDeleter: FolderDeleter;
  allParentFoldersStatusIsExists: AllParentFoldersStatusIsExists;
  folderPathUpdater: FolderPathUpdater;
  folderByPartialSearcher: FolderByPartialSearcher;
  synchronizeOfflineModificationsOnFolderCreated: SynchronizeOfflineModificationsOnFolderCreated;
  offline: {
    folderCreator: OfflineFolderCreator;
    folderPathUpdater: OfflineFolderPathUpdater;
    synchronizeOfflineModifications: SynchronizeOfflineModifications;
  };
}
