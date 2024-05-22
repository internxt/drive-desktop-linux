import { Service } from 'diod';
import { RemoteFileSystem } from '../../domain/file-systems/RemoteFileSystem';
import { FolderPath } from '../../domain/FolderPath';
import { FolderId } from '../../domain/FolderId';
import { Folder } from '../../domain/Folder';
import { FolderUuid } from '../../domain/FolderUuid';
import { FolderCreatedAt } from '../../domain/FolderCreatedAt';
import { FolderUpdatedAt } from '../../domain/FolderUpdatedAt';

@Service()
export class SimpleFolderCreator {
  constructor(private readonly rfs: RemoteFileSystem) {}

  async run(path: string, parentId: number): Promise<Folder> {
    const folderPath = new FolderPath(path);
    const folderParentId = new FolderId(parentId);

    const response = await this.rfs.persist(folderPath, folderParentId);

    return Folder.create(
      new FolderId(response.id),
      new FolderUuid(response.uuid),
      folderPath,
      folderParentId,
      FolderCreatedAt.fromString(response.createdAt),
      FolderUpdatedAt.fromString(response.updatedAt)
    );
  }
}
