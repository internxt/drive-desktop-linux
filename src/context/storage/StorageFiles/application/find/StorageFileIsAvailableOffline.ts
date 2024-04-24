import { Service } from 'diod';
import { StorageFileRepository } from '../../domain/StorageFileRepository';
import { StorageFileId } from '../../domain/StorageFileId';

@Service()
export class StorageFileIsAvailableOffline {
  constructor(private readonly repository: StorageFileRepository) {}

  async run(id: string) {
    const localFileId = new StorageFileId(id);

    return await this.repository.exists(localFileId);
  }
}
