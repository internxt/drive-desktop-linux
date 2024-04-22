import { Service } from 'diod';
import { DomainEventClass } from '../../../../shared/domain/DomainEvent';
import { DomainEventSubscriber } from '../../../../shared/domain/DomainEventSubscriber';
import { FileCreatedDomainEvent } from '../../../../virtual-drive/files/domain/events/FileCreatedDomainEvent';
import { DocumentDeleter } from './DocumentDeleter';

@Service()
export class DeleteDocumentOnFileCreated
  implements DomainEventSubscriber<FileCreatedDomainEvent>
{
  constructor(private readonly deleter: DocumentDeleter) {}

  subscribedTo(): DomainEventClass[] {
    return [FileCreatedDomainEvent];
  }

  async on(event: FileCreatedDomainEvent): Promise<void> {
    await this.deleter.run(event.path);
  }
}
