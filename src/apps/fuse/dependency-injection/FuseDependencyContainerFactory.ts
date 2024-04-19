import { DomainEvent } from '../../../context/shared/domain/DomainEvent';
import { DomainEventSubscriber } from '../../../context/shared/domain/DomainEventSubscriber';
import { EventBus } from '../../../context/virtual-drive/shared/domain/EventBus';
import { OfflineDriveDependencyContainerFactory } from './offline/OfflineDriveDependencyContainerFactory';
import { VirtualDriveDependencyContainerFactory } from './virtual-drive/VirtualDriveDependencyContainerFactory';
import { Container, ContainerBuilder, Newable } from 'diod';

export class FuseDependencyContainerFactory {
  static async build(sharedInfrastructure: Container): Promise<Container> {
    const builder = new ContainerBuilder();

    const sharedServices = sharedInfrastructure
      .findTaggedServiceIdentifiers('shared')
      .map((identifier) => sharedInfrastructure.get(identifier));

    sharedServices.forEach((service) =>
      builder.registerAndUse(service as Newable<unknown>)
    );

    await VirtualDriveDependencyContainerFactory.build(
      builder,
      sharedInfrastructure
    );

    await OfflineDriveDependencyContainerFactory.build(builder);

    const container = builder.build();

    const subscribers = container
      .findTaggedServiceIdentifiers<DomainEventSubscriber<DomainEvent>>(
        'event-handler'
      )
      .map((identifier) => container.get(identifier));

    const eventBus = container.get(EventBus);
    eventBus.addSubscribers(subscribers);

    return container;
  }
}
