import { Service } from 'diod';
import { EventBus } from '../../../shared/domain/EventBus';
import { File } from '../../domain/File';
import { FileRepository } from '../../domain/FileRepository';
import { FileSize } from '../../domain/FileSize';
import { FileNotFoundError } from '../../domain/errors/FileNotFoundError';
import { FileContentsId } from '../../domain/FileContentsId';
import { driveServerModule } from '../../../../../infra/drive-server/drive-server.module';

@Service()
export class FileOverrider {
  constructor(
    private readonly repository: FileRepository,
    private readonly eventBus: EventBus
  ) {}

  async run(
    oldContentsId: File['contentsId'],
    newContentsId: File['contentsId'],
    newSize: File['size']
  ): Promise<void> {
    const file = await this.repository.searchByContentsId(oldContentsId);

    if (!file) {
      throw new FileNotFoundError(oldContentsId);
    }

    file.changeContents(
      new FileContentsId(newContentsId),
      new FileSize(newSize)
    );

    await driveServerModule.files.replaceFile({
      uuid: file.uuid,
      fileId: file.contentsId,
      size: file.size,
    });

    await this.repository.update(file);

    this.eventBus.publish(file.pullDomainEvents());
  }
}
