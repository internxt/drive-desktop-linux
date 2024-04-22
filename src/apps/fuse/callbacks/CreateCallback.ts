import { Container } from 'diod';
import { NotifyFuseCallback } from './FuseCallback';
import { DocumentCreator } from '../../../context/offline-drive/documents/application/creation/DocumentCreator';

export class CreateCallback extends NotifyFuseCallback {
  constructor(private readonly container: Container) {
    super('Create');
  }

  async execute(path: string, _mode: number) {
    await this.container.get(DocumentCreator).run(path);

    // await this.container.get(OfflineFileAndContentsCreator).run(path);

    return this.right();
  }
}
