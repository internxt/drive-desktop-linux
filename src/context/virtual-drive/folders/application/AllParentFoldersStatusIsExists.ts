import { Service } from 'diod';
import { Folder } from '../domain/Folder';
import { FolderRepository } from '../domain/FolderRepository';
import { FolderStatuses } from '../domain/FolderStatus';

@Service()
export class AllParentFoldersStatusIsExists {
  constructor(private readonly repository: FolderRepository) {}

  async run(folderUuid: Folder['uuid']): Promise<boolean> {
    const folder = await this.repository.searchByUuid(folderUuid);

    if (!folder) {
      // TODO: investigate why when uploading a file in a path than previously existed returns undefined
      return true;
    }

    if (!folder.hasStatus(FolderStatuses.EXISTS)) {
      return false;
    }

    if (folder.isRoot() || !folder.parentUuid) {
      return true;
    }

    return this.run(folder.parentUuid);
  }
}
