import { Service } from 'diod';
import { Folder } from '../../domain/Folder';
import { FolderRepository } from '../../domain/FolderRepository';

@Service()
export class FolderRepositorySynchronizer {
  constructor(private readonly repository: FolderRepository) {}

  async clear(): Promise<void> {
    await this.repository.clear();
  }

  async run(remoteFolders: Array<Folder>, deletedFolderUuids: Set<string>): Promise<void> {
    const currentFolders = await this.repository.all();

    const foldersToDelete = currentFolders.filter((folder: Folder) => {
      return !folder.isRoot() && deletedFolderUuids.has(folder.uuid);
    });

    const addPromises = remoteFolders.map((folder: Folder) => this.repository.add(folder));

    const deletePromises = foldersToDelete.map((folder: Folder) => this.repository.delete(folder.uuid));

    await Promise.all([...addPromises, ...deletePromises]);
  }
}
