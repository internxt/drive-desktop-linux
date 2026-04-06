import { Service } from 'diod';
import { FileOverriddenDomainEvent } from '../../../virtual-drive/files/domain/events/FileOverriddenDomainEvent';
import { DomainEventSubscriber } from '../../domain/DomainEventSubscriber';
import { DomainEventClass } from '../../domain/DomainEvent';
import { getRemoteSyncService } from './remote-sync-service';

@Service()
export class TriggerRemoteSyncOnFileOverridden implements DomainEventSubscriber<FileOverriddenDomainEvent> {
  subscribedTo(): DomainEventClass[] {
    return [FileOverriddenDomainEvent];
  }

  async on(): Promise<void> {
    await getRemoteSyncService().resyncRemoteSync();
  }
}
