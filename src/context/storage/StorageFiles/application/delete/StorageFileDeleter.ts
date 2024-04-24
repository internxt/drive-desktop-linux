import { Service } from 'diod';
import { StorageFileRepository } from '../../domain/StorageFileRepository';
import { StorageFileCache } from '../../domain/StorageFileCache';
import { StorageFileId } from '../../domain/StorageFileId';

@Service()
export class StorageFileDeleter {
  constructor(
    private readonly repository: StorageFileRepository,
    private readonly cache: StorageFileCache
  ) {}

  async run(id: string) {
    const storageId = new StorageFileId(id);

    const exists = await this.repository.exists(storageId);

    if (exists) {
      await this.repository.delete(storageId);
    }

    const isCached = await this.cache.has(storageId);

    if (isCached) {
      this.cache.delete(storageId);
    }
  }
}
