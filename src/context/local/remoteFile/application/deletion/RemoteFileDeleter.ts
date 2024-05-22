import { Service } from 'diod';
import { RemoteFileRepository } from '../../domain/RemoteFileRepository';
import { RemoteFile } from '../../domain/RemoteFile';

@Service()
export class RemoteFileDeleter {
  constructor(private readonly repository: RemoteFileRepository) {}

  async run(file: RemoteFile): Promise<void> {
    if (!file.id) {
      return;
    }

    await this.repository.delete(file.id);
  }
}
