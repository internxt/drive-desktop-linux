import { Service } from 'diod';
import Logger from 'electron-log';
import { DocumentUploadedDomainEvent } from '../../../../offline-drive/documents/domain/upload/DocumentUploadedDomainEvent';
import { DomainEventClass } from '../../../../shared/domain/DomainEvent';
import { DomainEventSubscriber } from '../../../../shared/domain/DomainEventSubscriber';
import { FileCreator } from '../FileCreator';
import { FileOverrider } from '../override/FileOverrider';

@Service()
export class CreateFileOnOfflineFileUploaded
  implements DomainEventSubscriber<DocumentUploadedDomainEvent>
{
  constructor(
    private readonly creator: FileCreator,
    private readonly fileOverrider: FileOverrider
  ) {}

  subscribedTo(): DomainEventClass[] {
    return [DocumentUploadedDomainEvent, DocumentUploadedDomainEvent];
  }

  private async create(event: DocumentUploadedDomainEvent): Promise<void> {
    if (event.replaces) {
      await this.fileOverrider.run(
        event.replaces,
        event.aggregateId,
        event.size
      );
      return;
    }

    await this.creator.run(event.path, event.aggregateId, event.size);
  }

  async on(event: DocumentUploadedDomainEvent): Promise<void> {
    try {
      this.create(event);
    } catch (err) {
      Logger.error('[CreateFileOnOfflineFileUploaded]:', err);
    }
  }
}
