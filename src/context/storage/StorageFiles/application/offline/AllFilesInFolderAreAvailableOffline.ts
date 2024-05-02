import { Service } from 'diod';
import { StorageFilesRepository } from '../../domain/StorageFilesRepository';
import { StorageFileId } from '../../domain/StorageFileId';
import { SingleFolderMatchingFinder } from '../../../../virtual-drive/folders/application/SingleFolderMatchingFinder';
import { FilesByPartialSearcher } from '../../../../virtual-drive/files/application/search/FilesByPartialSearcher';
import { FileStatuses } from '../../../../virtual-drive/files/domain/FileStatus';
import { FoldersSearcherByPartial } from '../../../../virtual-drive/folders/application/search/FoldersSearcherByPartial';
import { FolderStatuses } from '../../../../virtual-drive/folders/domain/FolderStatus';
import { Folder } from '../../../../virtual-drive/folders/domain/Folder';

@Service()
export class AllFilesInFolderAreAvailableOffline {
  constructor(
    private readonly singleFolderFinder: SingleFolderMatchingFinder,
    private readonly filesByPartialSearcher: FilesByPartialSearcher,
    private readonly repository: StorageFilesRepository,
    private readonly foldersSearcherByPartial: FoldersSearcherByPartial
  ) {}

  private async subfoldersExists(folder: Folder): Promise<boolean> {
    const subfolders = await this.foldersSearcherByPartial.run({
      parentId: folder.id,
      status: FolderStatuses.EXISTS,
    });

    const subfoldersExistsPromise = subfolders.map((subfolder) => {
      return this.folderIsAvaliableOffline(subfolder);
    });

    const subfoldersExists = await Promise.all(subfoldersExistsPromise);

    return subfoldersExists.every((e) => e);
  }

  private async filesExists(folder: Folder): Promise<boolean> {
    const files = await this.filesByPartialSearcher.run({
      folderId: folder.id,
      status: FileStatuses.EXISTS,
    });

    if (files.length === 0) {
      return true;
    }

    const ids = files.map((file) => new StorageFileId(file.contentsId));

    const idsExistsPromise = ids.map((id) => this.repository.exists(id));

    const idsExists = await Promise.all(idsExistsPromise);

    return idsExists.every((e) => e);
  }

  private async folderIsAvaliableOffline(folder: Folder): Promise<boolean> {
    const subfoldersExists = await this.subfoldersExists(folder);
    const filesExists = await this.filesExists(folder);

    return filesExists && subfoldersExists;
  }

  async run(path: string): Promise<boolean> {
    const folder = await this.singleFolderFinder.run({
      path,
    });

    return this.folderIsAvaliableOffline(folder);
  }
}
