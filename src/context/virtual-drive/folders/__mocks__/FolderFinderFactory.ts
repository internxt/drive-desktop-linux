import { ParentFolderFinder } from '../application/ParentFolderFinder';
import { Folder } from '../domain/Folder';
import { FolderMother } from '../../../../../tests/context/virtual-drive/folders/domain/FolderMother';
import { FolderRepositoryMock } from './FolderRepositoryMock';

export class FolderFinderFactory {
  static existingFolder(folder?: Folder): ParentFolderFinder {
    const repository = new FolderRepositoryMock();

    const resolved = folder || FolderMother.any();

    repository.matchingPartialMock.mockReturnValueOnce([resolved]);

    return new ParentFolderFinder(repository);
  }
}
