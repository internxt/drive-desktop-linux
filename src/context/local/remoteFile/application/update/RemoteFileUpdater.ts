import { Service } from 'diod';
import { RemoteFileRepository } from '../../domain/RemoteFileRepository';

@Service()
export class RemoteFileUpdater {
  constructor(private readonly repository: RemoteFileRepository) {}

  async run(uuid: string, contentsId: string, size: number): Promise<void> {
    await this.repository.update(uuid, contentsId, size);
  }
}
