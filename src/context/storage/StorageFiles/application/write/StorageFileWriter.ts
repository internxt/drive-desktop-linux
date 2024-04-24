import { Service } from 'diod';
import { Readable } from 'stream';
import { StorageFileId } from '../../domain/StorageFileId';
import { StorageFileRepository } from '../../domain/StorageFileRepository';

@Service()
export class StorageFileWriter {
  constructor(private readonly repository: StorageFileRepository) {}

  async run(id: string, readable: Readable): Promise<void> {
    const storageId = new StorageFileId(id);

    await this.repository.store(storageId, readable);
  }
}
