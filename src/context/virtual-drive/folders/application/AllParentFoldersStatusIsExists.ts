import { Service } from 'diod';
import { Folder } from '../domain/Folder';
import { FolderRepository } from '../domain/FolderRepository';
import { DriveItemStatus } from '@internxt/drive-desktop-core/build/backend';

@Service()
export class AllParentFoldersStatusIsExists {
  constructor(private readonly repository: FolderRepository) {}

  async run(id: Folder['id']): Promise<boolean> {
    const folder = await this.repository.searchById(id);

    if (!folder) {
      // TODO: investigate why when uploading a file in a path than previously existed returns undefined
      return true;
    }

    if (!folder.hasStatus(DriveItemStatus.EXISTS)) {
      return false;
    }

    if (!folder.parentId) {
      return true;
    }

    return this.run(folder.parentId);
  }
}
