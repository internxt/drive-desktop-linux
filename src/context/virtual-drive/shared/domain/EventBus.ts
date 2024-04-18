import { Service } from 'diod';
import { SyncEngineDomainEventSubscribers } from '../../../../apps/sync-engine/dependency-injection/SyncEngineDomainEventSubscribers';
import { DomainEvent } from '../../../shared/domain/DomainEvent';

@Service()
export abstract class EventBus {
  abstract publish(events: Array<DomainEvent>): Promise<void>;
  abstract addSubscribers(subscribers: SyncEngineDomainEventSubscribers): void;
}
