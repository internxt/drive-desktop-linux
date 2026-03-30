import { Service } from 'diod';
import { StorageFilesRepository } from '../../domain/StorageFilesRepository';

@Service()
export class StorageClearer {
  constructor(
    private readonly repo: StorageFilesRepository,
  ) {}

  async run(): Promise<void> {
    await this.repo.deleteAll();
  }
}
