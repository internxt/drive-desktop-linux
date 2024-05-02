import { Service } from 'diod';
import { StorageFilesRepository } from '../../domain/StorageFilesRepository';
import { StorageFileId } from '../../domain/StorageFileId';
import { SingleFolderMatchingFinder } from '../../../../virtual-drive/folders/application/SingleFolderMatchingFinder';
import { FilesByPartialSearcher } from '../../../../virtual-drive/files/application/search/FilesByPartialSearcher';
import { FileStatuses } from '../../../../virtual-drive/files/domain/FileStatus';

@Service()
export class AllFilesInFolderAreAvailableOffline {
  constructor(
    private readonly singleFolderFinder: SingleFolderMatchingFinder,
    private readonly filesByPartialSearcher: FilesByPartialSearcher,
    private readonly repository: StorageFilesRepository
  ) {}

  async run(path: string): Promise<boolean> {
    const folder = await this.singleFolderFinder.run({ path });

    const files = await this.filesByPartialSearcher.run({
      folderId: folder.id,
      status: FileStatuses.EXISTS,
    });

    if (files.length === 0) {
      return false;
    }

    const ids = files.map((file) => new StorageFileId(file.contentsId));

    const idsExistsPromise = ids.map((id) => this.repository.exists(id));

    const idsExists = await Promise.all(idsExistsPromise);

    return idsExists.every((e) => e);
  }
}
