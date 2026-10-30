import { Folder, FolderAttributes } from '../domain/Folder';
import { FolderRepository } from '../domain/FolderRepository';
import { FolderStatuses } from '../domain/FolderStatus';
import { Service } from 'diod';

@Service()
export class InMemoryFolderRepository implements FolderRepository {
  private folders: Map<Folder['uuid'], FolderAttributes>;

  constructor() {
    this.folders = new Map();
  }

  private get values(): Array<FolderAttributes> {
    return Array.from(this.folders.values());
  }

  all(): Promise<Folder[]> {
    const folders = [...this.folders.values()].map((attributes) => Folder.from(attributes));

    return Promise.resolve(folders);
  }

  async searchByUuid(id: Folder['uuid']): Promise<Folder | undefined> {
    const attributes = this.folders.get(id);

    if (!attributes) return;

    return Folder.from(attributes);
  }

  matchingPartial(partial: Partial<FolderAttributes>): Array<Folder> {
    const keys = Object.keys(partial) as Array<keyof Partial<FolderAttributes>>;

    const foldersAttributes = this.values.filter((attributes) => {
      return keys.every((key: keyof FolderAttributes) => attributes[key] === partial[key]);
    });

    return foldersAttributes.map((attributes) => Folder.from(attributes));
  }

  searchByPathPrefix(pathPrefix: string, status?: FolderStatuses): Array<Folder> {
    const foldersAttributes = this.values.filter((attributes) => {
      const matchesPath = attributes.path.startsWith(pathPrefix);
      const matchesStatus = status === undefined || attributes.status === status;
      return matchesPath && matchesStatus;
    });

    return foldersAttributes.map((attributes) => Folder.from(attributes));
  }

  async add(folder: Folder): Promise<void> {
    this.folders.set(folder.uuid, folder.attributes());
  }

  async delete(uuid: Folder['uuid']): Promise<void> {
    const deleted = this.folders.delete(uuid);

    if (!deleted) {
      throw new Error('Folder not found');
    }
  }

  async update(folder: Folder): Promise<void> {
    if (!this.folders.has(folder.uuid)) {
      throw new Error('Folder not found');
    }

    return this.add(folder);
  }

  async clear(): Promise<void> {
    this.folders.clear();
  }
}
