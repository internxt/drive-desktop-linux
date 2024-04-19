import { Container, ContainerBuilder, Newable } from 'diod';
import { files } from './virtual-drive/files/files';
import { contents } from './virtual-drive/contents/contents';
import { folders } from './virtual-drive/folders/folders';
import { tree } from './virtual-drive/tree/tree';

export class HydrationApiContainerFactory {
  static async build(sharedInfrastructure: Container): Promise<Container> {
    const builder = new ContainerBuilder();

    const sharedServices = sharedInfrastructure
      .findTaggedServiceIdentifiers('shared')
      .map((identifier) => sharedInfrastructure.get(identifier));

    sharedServices.forEach((service) =>
      builder.registerAndUse(service as Newable<unknown>)
    );

    files(builder);
    folders(builder);
    contents(builder);
    tree(builder);

    return builder.build();
  }
}
