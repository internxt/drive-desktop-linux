import { Service } from 'diod';
import { Folder } from '../domain/Folder';
import { FolderRepository } from '../domain/FolderRepository';
import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';

@Service()
export class AllParentFoldersStatusIsExists {
  constructor(private readonly repository: FolderRepository) {}

  async run(folderUuid: Folder['uuid']): Promise<boolean> {
    const folder = await this.repository.searchByUuid(folderUuid);

    if (!folder) {
      // TODO: investigate why when uploading a file in a path than previously existed returns undefined
      return true;
    }

    if (!folder.hasStatus(DriveItemStatus.EXISTS)) {
      return false;
    }

    if (folder.isRoot() || !folder.parentUuid) {
      return true;
    }

    return this.run(folder.parentUuid);
  }
}
