import { Container, ContainerBuilder } from 'diod';
import { Traverser } from '../../../../../context/virtual-drive/tree/application/Traverser';
import { TreeBuilder } from '../../../../../context/virtual-drive/tree/application/TreeBuilder';
import { RemoteItemsGenerator } from '../../../../../context/virtual-drive/tree/domain/RemoteItemsGenerator';

export function registerTreeServices(
  builder: ContainerBuilder,
  sharedInfrastructure: Container
): ContainerBuilder {
  builder
    .register(TreeBuilder)
    .useFactory(
      () =>
        new TreeBuilder(
          sharedInfrastructure.get(RemoteItemsGenerator),
          sharedInfrastructure.get(Traverser)
        )
    );

  return builder;
}
