import { Container } from 'diod';
import { FuseCallback } from './FuseCallback';
import { FilesByFolderPathSearcher } from '../../../context/virtual-drive/files/application/FilesByFolderPathSearcher';
import { FoldersByParentPathLister } from '../../../context/virtual-drive/folders/application/FoldersByParentPathLister';
import { DocumentsFinderByFolder } from '../../../context/offline-drive/documents/application/find/DocumentsFinderByFolder';

export class ReaddirCallback extends FuseCallback<Array<string>> {
  constructor(private readonly container: Container) {
    super('Read Directory');
  }

  async execute(path: string) {
    const filesNamesPromise = this.container
      .get(FilesByFolderPathSearcher)
      .run(path);

    const folderNamesPromise = this.container
      .get(FoldersByParentPathLister)
      .run(path);

    const documents = await this.container
      .get(DocumentsFinderByFolder)
      .run(path);

    const auxiliaryFileName = documents
      .filter((file) => file.isAuxiliary())
      .map((file) => file.name);

    const [filesNames, foldersNames] = await Promise.all([
      filesNamesPromise,
      folderNamesPromise,
    ]);

    return this.right([
      '.',
      '..',
      ...filesNames,
      ...foldersNames,
      ...auxiliaryFileName,
    ]);
  }
}
