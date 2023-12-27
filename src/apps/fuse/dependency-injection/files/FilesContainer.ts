import { FilesSearcher } from '../../../../context/virtual-drive/files/application/FilesSearcher';
import { FilesByFolderPathSearcher } from '../../../../context/virtual-drive/files/application/FilesByFolderPathSearcher';
import { FilePathUpdater } from '../../../../context/virtual-drive/files/application/FilePathUpdater';
import { FileCreator } from '../../../../context/virtual-drive/files/application/FileCreator';
import { SameFileWasMoved } from '../../../../context/virtual-drive/files/application/SameFileWasMoved';
import { FileDeleter } from '../../../../context/virtual-drive/files/application/FileDeleter';

export interface FilesContainer {
  filesByFolderPathNameLister: FilesByFolderPathSearcher;
  filesSearcher: FilesSearcher;
  filePathUpdater: FilePathUpdater;
  fileCreator: FileCreator;
  fileDeleter: FileDeleter;
  sameFileWasMoved: SameFileWasMoved;
}
