import { SingleFolderMatchingFinder } from '../../../../../src/context/virtual-drive/folders/application/SingleFolderMatchingFinder';
import {
  Folder,
  FolderAttributes,
} from '../../../../../src/context/virtual-drive/folders/domain/Folder';
import { FolderRepository } from '../../../../../src/context/virtual-drive/folders/domain/FolderRepository';

export class SingleFolderMatchingFinderTestClass extends SingleFolderMatchingFinder {
  private readonly mock = jest.fn();

  constructor() {
    super({} as FolderRepository);
  }

  async run(p: Partial<FolderAttributes>) {
    return this.mock(p);
  }

  finds(folder: Folder) {
    this.mock.mockReturnValueOnce(folder);
  }
}
